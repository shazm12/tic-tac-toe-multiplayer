import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

interface TimerProps {
  time: number;
  setTime: (time: number) => void;
  isActive: boolean;
  onTimeUp?: () => void;
}

export default function Timer({ time, setTime, isActive, onTimeUp }: TimerProps) {
  useEffect(() => {
    if (!isActive || time <= 0) {
      if (time === 0 && onTimeUp) {
        onTimeUp();
      }
      return;
    }

    const timer = setInterval(() => {
      setTime(time - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [time, isActive, setTime, onTimeUp]);

  const formatTime = (seconds: number): string => {
    const secs = seconds % 60;
    return `${secs.toString().padStart(2, '0')}s`;
  };

  const getTimerColor = () => {
    if (time <= 10) return 'text-red-500';
    if (time <= 30) return 'text-yellow-500';
    return 'text-cyan-400';
  };

  return (
    <View className="bg-cyan-900 px-6 py-3 rounded-xl border-2 border-cyan-700 flex justify-center items-center">
      <Text className={`text-2xl font-bold ${getTimerColor()}`}>
        {formatTime(time)}
      </Text>
    </View>
  );
}
