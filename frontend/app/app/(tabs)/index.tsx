import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const features = [
  {
    icon: 'location' as const,
    label: 'Real-time bus tracking',
    description: 'See exactly where your bus is, live.',
    iconBg: 'bg-cyan-500/20',
    iconColor: '#67e8f9',
  },
  {
    icon: 'time' as const,
    label: 'Arrival time & seat count',
    description: 'Stop guessing. Plan your trip.',
    iconBg: 'bg-emerald-500/20',
    iconColor: '#34d399',
  },
  {
    icon: 'notifications' as const,
    label: 'Reserve your seat',
    description: "Let the conductor know you're coming.",
    iconBg: 'bg-violet-500/20',
    iconColor: '#a78bfa',
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView className='flex-1 bg-slate-950'>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className='flex-1 bg-slate-950'>
          {/* ── Hero header ── */}
          <View className='bg-blue-900 px-6 pb-20 pt-14'>
            {/* Wordmark */}
            <View className='mb-10 flex-row items-center gap-3'>
              <View className='h-11 w-11 items-center justify-center rounded-2xl bg-blue-700'>
                <Image
                  source={require('@/assets/images/splash-icon.png')}
                  className='h-6 w-6'
                  contentFit='contain'
                />
              </View>
              <View>
                <Text className='text-lg font-medium text-blue-50'>
                  Asondia
                </Text>
                <Text className='text-xs uppercase tracking-widest text-blue-300'>
                  Smart transport hub
                </Text>
              </View>
            </View>

            {/* Headline */}
            <Text className='text-4xl font-bold leading-tight text-white'>
              Know where your bus is.{'\n'}Before you even leave home.
            </Text>
            <Text className='mt-4 text-base leading-relaxed text-blue-300'>
              Real-time tracking for AMOEC commuters{'\n'}on the Allen–Catarman
              route.
            </Text>
          </View>

          {/* ── Feature cards ── */}
          <View className='-mt-8 mx-4 gap-3'>
            {features.map((f) => (
              <View
                key={f.label}
                className='flex-row items-center gap-4 rounded-3xl border border-white/8 bg-slate-800 px-5 py-5'
              >
                <View
                  className={`h-12 w-12 items-center justify-center rounded-2xl ${f.iconBg}`}
                >
                  <Ionicons name={f.icon} size={24} color={f.iconColor} />
                </View>
                <View className='flex-1'>
                  <Text className='text-base font-semibold text-slate-100'>
                    {f.label}
                  </Text>
                  <Text className='mt-1 text-sm text-slate-400'>
                    {f.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── CTA buttons ── */}
          <View className='mx-4 mt-auto pb-10 pt-10 gap-3'>
            <Link href='/sign-up' asChild>
              <TouchableOpacity
                className='items-center rounded-3xl bg-blue-600 py-5'
                activeOpacity={0.85}
              >
                <Text className='text-lg font-semibold text-white'>
                  Get started
                </Text>
              </TouchableOpacity>
            </Link>

            <Link href='/sign-in' asChild>
              <TouchableOpacity
                className='items-center rounded-3xl border border-white/15 py-5'
                activeOpacity={0.75}
              >
                <Text className='text-lg font-medium text-slate-200'>
                  Log in
                </Text>
              </TouchableOpacity>
            </Link>

            <Text className='mt-2 text-center text-sm text-slate-500'>
              Free to use for AMOEC commuters.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
