import { DeviceFingerprint } from './../interfaces/interfaces';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@tictactoe_device_id';

export const generateDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  let storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  
  if (!storedDeviceId) {
    storedDeviceId = `${Device.modelName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
  }

  return {
    deviceId: storedDeviceId,
    deviceModel: Device.modelName || 'unknown',
    osVersion: Device.osVersion || 'unknown',
    appVersion: Application.nativeApplicationVersion || '1.0.0',
    brand: Device.brand || 'unknown',
    manufacturer: Device.manufacturer || 'unknown',
  };
};
