import type { FactoryRoomSnapshot } from "./room-monitoring";

export type EnvironmentRange = "24h" | "7d";
export type EnvironmentMetric = "temperature" | "humidity";

export interface EnvironmentPoint {
  label: string;
  temperature: number;
  humidity: number;
}
export interface EnvironmentAnomaly {
  id: string;
  startedAt: string;
  endedAt?: string;
  metric: EnvironmentMetric;
  level: "warning" | "critical";
  reading: string;
  threshold: string;
  status: "active" | "resolved";
  note: string;
}

export interface RoomEnvironmentProfile {
  roomId: string;
  temperatureRange: readonly [number, number];
  humidityRange: readonly [number, number];
  samplingInterval: string;
  sensorName: string;
  history: Record<EnvironmentRange, EnvironmentPoint[]>;
  anomalies: EnvironmentAnomaly[];
}

interface EnvironmentPreset {
  temperatureRange: readonly [number, number];
  humidityRange: readonly [number, number];
  temperatureOffsets: number[];
  humidityOffsets: number[];
  weeklyTemperatureOffsets: number[];
  weeklyHumidityOffsets: number[];
  anomalies: EnvironmentAnomaly[];
  sensorName: string;
}

const HOURLY_LABELS = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "现在"];

function relativeDayLabel(offsetDays: number) {
  if (offsetDays === 0) return "今天";
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", timeZone: "Asia/Shanghai" }).format(date);
}

const DAILY_LABELS = [-6, -5, -4, -3, -2, -1, 0].map(relativeDayLabel);

const DEFAULT_TEMPERATURE_OFFSETS = [-0.5, -0.4, -0.4, -0.2, 0, 0.3, 0.5, 0.4, 0.2, 0.1, -0.1, 0];
const DEFAULT_HUMIDITY_OFFSETS = [-2, -1, -1, 0, 1, 2, 3, 2, 1, 0, -1, 0];
const DEFAULT_WEEKLY_TEMPERATURE_OFFSETS = [-0.4, -0.2, 0.1, -0.1, 0.3, 0.2, 0];
const DEFAULT_WEEKLY_HUMIDITY_OFFSETS = [-2, -1, 1, 0, 2, 1, 0];

const PRESETS: Record<string, EnvironmentPreset> = {
  R11: {
    temperatureRange: [0, 4],
    humidityRange: [35, 65],
    temperatureOffsets: [-0.4, -0.3, -0.3, -0.1, 0.2, 0.6, 0.4, 0.2, -0.1, 0, 0.1, 0],
    humidityOffsets: [-2, -1, 0, 1, 2, 4, 3, 1, 0, -1, -1, 0],
    weeklyTemperatureOffsets: [-0.3, -0.2, 0.1, -0.1, 0.2, 0.3, 0],
    weeklyHumidityOffsets: [-2, 0, 1, -1, 2, 1, 0],
    sensorName: "TH-R11-01",
    anomalies: [
      { id: "EA-R11-01", startedAt: `${relativeDayLabel(-3)} 14:20`, endedAt: "14:45", metric: "humidity", level: "warning", reading: "67%RH", threshold: "上限 65%RH", status: "resolved", note: "开门补货后湿度短时升高，已自动恢复" },
    ],
  },
  R12: {
    temperatureRange: [-22, -16],
    humidityRange: [30, 60],
    temperatureOffsets: [-0.7, -0.5, -0.4, -0.2, 0.3, 0.8, 0.5, 0.2, -0.2, -0.1, 0, 0],
    humidityOffsets: [-2, -1, 0, 0, 1, 3, 2, 1, 0, -1, -1, 0],
    weeklyTemperatureOffsets: [-0.6, -0.3, 0.1, -0.2, 0.4, 0.2, 0],
    weeklyHumidityOffsets: [-2, -1, 1, 0, 2, 1, 0],
    sensorName: "TH-R12-01",
    anomalies: [
      { id: "EA-R12-01", startedAt: `${relativeDayLabel(-4)} 08:12`, endedAt: "08:31", metric: "temperature", level: "warning", reading: "-15.4°C", threshold: "上限 -16°C", status: "resolved", note: "集中出库造成短时温升，库门关闭后恢复" },
    ],
  },
  R13: {
    temperatureRange: [10, 28],
    humidityRange: [35, 65],
    temperatureOffsets: DEFAULT_TEMPERATURE_OFFSETS,
    humidityOffsets: DEFAULT_HUMIDITY_OFFSETS,
    weeklyTemperatureOffsets: DEFAULT_WEEKLY_TEMPERATURE_OFFSETS,
    weeklyHumidityOffsets: DEFAULT_WEEKLY_HUMIDITY_OFFSETS,
    sensorName: "TH-R13-01",
    anomalies: [],
  },
  R14: {
    temperatureRange: [0, 4],
    humidityRange: [35, 65],
    temperatureOffsets: [-1.8, -1.7, -1.9, -1.5, -1.2, -0.8, -0.5, -0.3, -0.1, 0.2, 0.5, 0],
    humidityOffsets: [-3, -2, -1, 0, 1, 2, 3, 2, 1, 1, 0, 0],
    weeklyTemperatureOffsets: [-1.2, -0.9, -0.7, -0.5, -0.2, 0.3, 0],
    weeklyHumidityOffsets: [-3, -2, 0, 1, 2, 1, 0],
    sensorName: "TH-R14-02",
    anomalies: [
      { id: "EA-R14-03", startedAt: "今天 09:35", metric: "temperature", level: "warning", reading: "4.8°C", threshold: "上限 4°C", status: "active", note: "温度持续高于上限，待检查库门与制冷机组" },
      { id: "EA-R14-02", startedAt: `${relativeDayLabel(-2)} 16:42`, endedAt: "17:05", metric: "temperature", level: "warning", reading: "4.5°C", threshold: "上限 4°C", status: "resolved", note: "补货期间库门开启，关闭后恢复" },
      { id: "EA-R14-01", startedAt: `${relativeDayLabel(-5)} 06:18`, endedAt: "06:32", metric: "humidity", level: "warning", reading: "68%RH", threshold: "上限 65%RH", status: "resolved", note: "除霜结束后湿度短时升高" },
    ],
  },
};

function numericReading(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function points(labels: string[], temperature: number, humidity: number, temperatureOffsets: number[], humidityOffsets: number[]): EnvironmentPoint[] {
  return labels.map((label, index) => ({
    label,
    temperature: Number((temperature + temperatureOffsets[index]).toFixed(1)),
    humidity: Number((humidity + humidityOffsets[index]).toFixed(0)),
  }));
}

export function getRoomEnvironmentProfile(room: FactoryRoomSnapshot): RoomEnvironmentProfile {
  const temperature = numericReading(room.temperature, 18);
  const humidity = numericReading(room.humidity, 50);
  const preset = PRESETS[room.id] ?? {
    temperatureRange: [8, 24] as const,
    humidityRange: [35, 70] as const,
    temperatureOffsets: DEFAULT_TEMPERATURE_OFFSETS,
    humidityOffsets: DEFAULT_HUMIDITY_OFFSETS,
    weeklyTemperatureOffsets: DEFAULT_WEEKLY_TEMPERATURE_OFFSETS,
    weeklyHumidityOffsets: DEFAULT_WEEKLY_HUMIDITY_OFFSETS,
    sensorName: `TH-${room.id}-01`,
    anomalies: [],
  };

  return {
    roomId: room.id,
    temperatureRange: preset.temperatureRange,
    humidityRange: preset.humidityRange,
    samplingInterval: "5 分钟",
    sensorName: preset.sensorName,
    history: {
      "24h": points(HOURLY_LABELS, temperature, humidity, preset.temperatureOffsets, preset.humidityOffsets),
      "7d": points(DAILY_LABELS, temperature, humidity, preset.weeklyTemperatureOffsets, preset.weeklyHumidityOffsets),
    },
    anomalies: preset.anomalies,
  };
}
