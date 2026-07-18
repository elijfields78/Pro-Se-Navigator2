import React, { useRef, useEffect } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="cases">
        <Icon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} />
        <Label>Cases</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} />
        <Label>Chat</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sources">
        <Icon sf={{ default: 'checkmark.seal', selected: 'checkmark.seal.fill' }} />
        <Label>Sources</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="deadlines">
        <Icon sf={{ default: 'clock', selected: 'clock.fill' }} />
        <Label>Deadlines</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** Icon-only tab glyph: springs to 1.1 when active, jade dot below. */
function TabIcon({
  name,
  focused,
  activeColor,
  inactiveColor,
}: {
  name: keyof typeof Feather.glyphMap;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
}) {
  const scale = useRef(new Animated.Value(focused ? 1.1 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.1 : 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return (
    <View style={styles.tabIconWrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Feather name={name} size={22} color={focused ? activeColor : inactiveColor} />
      </Animated.View>
      <View
        style={[
          styles.tabDot,
          { backgroundColor: focused ? activeColor : 'transparent' },
        ]}
      />
    </View>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isWeb = Platform.OS === 'web';

  const icon =
    (name: keyof typeof Feather.glyphMap) =>
    ({ focused }: { focused: boolean }) => (
      <TabIcon
        name={name}
        focused={focused}
        activeColor={colors.primary}
        inactiveColor={colors.textMuted}
      />
    );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 72 : undefined,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            {/* Fallback tint — BlurView is weak/absent on Android and web */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: colors.surface,
                  opacity: Platform.OS === 'ios' ? 0.55 : 0.96,
                },
              ]}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen name="cases" options={{ title: 'Cases', tabBarIcon: icon('briefcase') }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: icon('message-circle') }} />
      <Tabs.Screen name="sources" options={{ title: 'Sources', tabBarIcon: icon('check-circle') }} />
      <Tabs.Screen name="deadlines" options={{ title: 'Deadlines', tabBarIcon: icon('clock') }} />
      {/* Artifacts removed from tab bar — accessible via Settings menu */}
      <Tabs.Screen name="artifacts" options={{ href: null }} />
      {/* Hidden — redirect only */}
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 6,
  },
  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
