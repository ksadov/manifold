import { HapticTab } from 'components/HapticTab'
import { useUser } from 'hooks/useUser'
import { IconSymbol } from 'components/ui/IconSymbol'
import TabBarBackground from 'components/ui/TabBarBackground'
import { Tabs } from 'expo-router'
import { useColor } from 'hooks/useColor'
import React from 'react'
import { Platform, View, Image } from 'react-native'

export default function TabLayout() {
  const maniColor = useColor()

  const commonTabBarStyle = {
    backgroundColor: maniColor.background,
    borderTopWidth: 1, // Remove top border
    shadowOpacity: 0, // Remove shadow
    borderTopColor: maniColor.border,
    paddingTop: 4,
    paddingBottom: 4,
  }

  const iosSpecificStyle = {
    position: 'absolute',
  }

  const { user } = useUser()
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: maniColor.primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            ...commonTabBarStyle,
            ...iosSpecificStyle,
          },
          default: commonTabBarStyle,
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="chart.line.uptrend.xyaxis"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name={'profile'}
        options={{
          title: user?.displayName || 'Profile',
          tabBarIcon: ({ color }) => (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor:
                  // user?.avatarUrl ? 'transparent' :
                  maniColor.blue,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                style={{
                  width:
                    // user?.avatarUrl ? 28 :
                    20,
                  height:
                    // user?.avatarUrl ? 28 :
                    20,
                  borderRadius:
                    // user?.avatarUrl ? 14 :
                    0,
                }}
                source={
                  // user?.avatarUrl
                  //   ? { uri: user.avatarUrl }
                  //   :
                  require('assets/images/origami-icons/turtle.png')
                }
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bell" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bag" color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
