import { DAY_MS } from 'common/util/time'
import {
  createSupabaseDirectClient,
  SupabaseDirectClient,
} from 'shared/supabase/init'
import { contractColumnsToSelect, isProd, log } from 'shared/utils'
import { chunk, groupBy, sortBy, sumBy, uniq, uniqBy } from 'lodash'
import { Contract, CPMMMultiContract } from 'common/contract'
import {
  calculateMetricsByContractAndAnswer,
  isEmptyMetric,
} from 'common/calculate-metrics'
import { filterDefined } from 'common/util/array'
import { hasSignificantDeepChanges } from 'common/util/object'
import { convertBet } from 'common/supabase/bets'
import { ContractMetric } from 'common/contract-metric'
import { bulkUpdateData } from './supabase/utils'
import { convertAnswer, convertContract } from 'common/supabase/contracts'

const CHUNK_SIZE = isProd() ? 400 : 10
export async function updateUserMetricPeriods(
  userIds?: string[],
  since?: number,
  skipUpdates?: boolean
) {
  log('Starting user period metrics update')
  const useSince = since !== undefined
  const now = Date.now()
  const eightDays = DAY_MS * 8
  const eightDaysAgo = now - eightDays
  const daysAgo = Math.round(useSince ? (now - since) / DAY_MS : eightDays)
  const pg = createSupabaseDirectClient()

  log('Loading active contract ids...')
  const activeContractIds = userIds
    ? []
    : await pg.map(
        `
    with recent_bets as (
      select distinct contract_id
    from contract_bets
    where created_time > now() - interval '${daysAgo} day'
    ),
    recent_contracts as (
      select distinct id as contract_id
      from contracts
      where resolution_time > now() - interval '${daysAgo} day'
    ),
    recent_answers as (
      select distinct a.contract_id
      from answers a
      where a.resolution_time > now() - interval '${daysAgo} day'
    )
    select distinct contract_id
    from (
      select contract_id from recent_bets
      union
      select contract_id from recent_contracts
      union
      select contract_id from recent_answers
    ) as combined_contracts;
    `,
        [],
        (r) => r.contract_id as string
      )
  log('Loading active users...')
  const allActiveUserIds = userIds
    ? userIds
    : await pg.map(
        `
      select distinct user_id from user_contract_metrics
      where contract_id in ($1:list)
      `,
        [activeContractIds],
        (r) => r.user_id as string
      )

  log(`Loaded ${allActiveUserIds.length} active users.`)
  const chunks = chunk(allActiveUserIds, CHUNK_SIZE)
  const metricsByUser: Record<string, ContractMetric[]> = {}
  const contractsById: Record<string, Contract> = {}
  for (const activeUserIds of chunks) {
    log('Loading bets for', activeUserIds)
    const metricRelevantBets = await getUnresolvedOrRecentlyResolvedBets(
      pg,
      activeUserIds,
      useSince ? since : eightDaysAgo
    )
    log(
      `Loaded ${sumBy(
        Object.values(metricRelevantBets),
        (bets) => bets.length
      )} bets.`
    )

    const allBets = Object.values(metricRelevantBets).flat()
    const contractIds = uniq(allBets.map((b) => b.contractId))
    log('Loading contracts, answers, users, and current contract metrics...')
    // We could cache the contracts and answers to query for less data
    const results = await pg.multi(
      `
      select ${contractColumnsToSelect} from contracts where id in ($1:list);

      select * from answers
      where contract_id in ($1:list);

      select id, data from user_contract_metrics
      where user_id in ($2:list)
      and contract_id in ($3:list);
    `,
      [contractIds.filter((c) => !contractsById[c]), activeUserIds, contractIds]
    )
    const contracts = results[0].map(convertContract)
    const answers = results[1].map(convertAnswer)
    const answersByContractId = groupBy(answers, (a) => a.contractId)
    const currentContractMetrics = results[2].map(
      (r) => ({ id: r.id, ...r.data } as ContractMetric)
    )

    log(
      `Loaded ${contracts.length} contracts,
       ${answers.length} answers,
       and ${currentContractMetrics.length} contract metrics.`
    )

    contracts.forEach((c) => {
      const answers = answersByContractId[c.id] ?? []
      if (c.mechanism === 'cpmm-multi-1') {
        // eslint-disable-next-line no-extra-semi
        ;(c as CPMMMultiContract).answers = answers
      }
      contractsById[c.id] = c
    })

    const currentMetricsByUserId = groupBy(
      currentContractMetrics,
      (m) => m.userId
    )

    const contractMetricUpdates: Pick<ContractMetric, 'from' | 'id'>[] = []

    log('Computing metric updates...')
    for (const userId of activeUserIds) {
      const userMetricRelevantBets = metricRelevantBets[userId] ?? []

      const metricRelevantBetsByContract = groupBy(
        userMetricRelevantBets,
        (b) => b.contractId
      )
      const freshMetrics = calculateMetricsByContractAndAnswer(
        metricRelevantBetsByContract,
        contractsById,
        userId,
        answersByContractId
      ).flat()
      const currentMetricsForUser = currentMetricsByUserId[userId] ?? []
      metricsByUser[userId] = uniqBy(
        [...freshMetrics, ...currentMetricsForUser],
        (m) => m.contractId + m.answerId
      )
      contractMetricUpdates.push(
        ...filterDefined(
          freshMetrics.map((freshMetric) => {
            const currentMetric = currentMetricsForUser.find(
              (m) =>
                freshMetric.contractId === m.contractId &&
                freshMetric.answerId === m.answerId
            )
            if (!currentMetric) {
              !isEmptyMetric(freshMetric) &&
                log.error(
                  `Current metric not found for user ${userId}, contract ${freshMetric.contractId}, answer ${freshMetric.answerId}`
                )
              return undefined
            }
            if (
              freshMetric.from &&
              hasSignificantDeepChanges(
                currentMetric.from ?? {},
                freshMetric.from,
                0.1
              )
            ) {
              return {
                id: currentMetric.id,
                from: freshMetric.from,
                payout: freshMetric.payout,
                profit: freshMetric.profit,
                profitPercent: freshMetric.profitPercent,
              }
            }
            return undefined
          })
        )
      )
    }
    log(`Computed ${contractMetricUpdates.length} metric updates.`)

    if (contractMetricUpdates.length > 0 && !skipUpdates) {
      log('Writing updates')
      await bulkUpdateData(pg, 'user_contract_metrics', contractMetricUpdates)
        .catch((e) => log.error('Error upserting contract metrics', e))
        .then(() =>
          log(
            'Finished updating ' +
              contractMetricUpdates.length +
              ' user period metrics.'
          )
        )
    }
  }
  log('Finished updating user period metrics')
  return { metricsByUser, contractsById }
}

const getUnresolvedOrRecentlyResolvedBets = async (
  pg: SupabaseDirectClient,
  userIds: string[],
  since: number
) => {
  const bets = await pg.map(
    `
    select cb.amount, cb.shares, cb.outcome, cb.loan_amount, cb.user_id, cb.answer_id, cb.contract_id, cb.created_time, cb.is_redemption
    from contract_bets as cb
    join contracts as c on cb.contract_id = c.id
    left join answers as a on cb.answer_id = a.id
    where
      cb.user_id in ($1:list)
      and (c.resolution_time is null or c.resolution_time > $2)
      and (a is null or a.resolution_time is null or a.resolution_time > $2)
    `,
    [userIds, new Date(since).toISOString()],
    convertBet
  )

  return groupBy(
    sortBy(bets, (b) => b.createdTime),
    (r) => r.userId as string
  )
}
