import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { SafeAreaView, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView className='flex-1 bg-slate-950'>
      <View className='flex-1 px-6 py-8 justify-between'>
        <View className='space-y-8'>
          <View className='items-center'>
            <View className='h-28 w-28 rounded-full bg-cyan-500/15 items-center justify-center'>
              <Image
                source={require('@/assets/images/splash-icon.png')}
                className='h-16 w-16'
              />
            </View>
          </View>

          <View className='space-y-4'>
            <Text className='text-4xl font-bold text-white'>Asondia</Text>
            <Text className='text-base text-slate-300'>
              Smart bus operations for routes, drivers and riders in one place.
            </Text>
          </View>

          <View className='rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4'>
            <Text className='text-xs uppercase tracking-[0.35em] text-cyan-300'>
              Key features
            </Text>
            <View className='space-y-3'>
              <View className='flex-row items-start gap-3'>
                <View className='mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400' />
                <Text className='text-sm text-slate-200'>
                  Live trips and route status.
                </Text>
              </View>
              <View className='flex-row items-start gap-3'>
                <View className='mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400' />
                <Text className='text-sm text-slate-200'>
                  Driver and schedule management.
                </Text>
              </View>
              <View className='flex-row items-start gap-3'>
                <View className='mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400' />
                <Text className='text-sm text-slate-200'>
                  Secure access for staff and riders.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className='space-y-4'>
          <Link href='/modal'>
            <Link.Trigger>
              <View className='rounded-3xl bg-cyan-500 px-6 py-4 shadow-lg shadow-cyan-500/20'>
                <Text className='text-center text-base font-semibold text-slate-950'>
                  Get started
                </Text>
              </View>
            </Link.Trigger>
          </Link>
          <Text className='text-center text-sm text-slate-500'>
            Auth flows are ready to build next. Tap continue to keep going.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
