import type { WorkOrderOutputView } from "@/lib/types";

type Output = WorkOrderOutputView["outputs"][number];

export function outputTemperatureRange(output: Output) {
  if (output.temperatureMin !== null && output.temperatureMax !== null) {
    return `${output.temperatureMin}–${output.temperatureMax} ℃`;
  }
  if (output.temperatureMin !== null) return `不低于 ${output.temperatureMin} ℃`;
  if (output.temperatureMax !== null) return `不高于 ${output.temperatureMax} ℃`;
  return "冻结工艺未设置温度范围";
}

export function qualityReleaseIssue(input: {
  measuredTemperature: string;
  output: Output;
  appearancePassed: boolean;
  packageSealPassed: boolean;
  labelPassed: boolean;
  standardVersion: string;
  sampleQuantity: string;
  locationId: string;
}) {
  if (!input.standardVersion.trim()) return "请填写质量标准版本";
  const sampleQuantity = Number(input.sampleQuantity);
  if (!Number.isInteger(sampleQuantity) || sampleQuantity <= 0) return "抽样数量必须为正整数";
  const measured = Number(input.measuredTemperature);
  if (!Number.isFinite(measured)) return "请填写有效的实测温度";
  if (!input.appearancePassed || !input.packageSealPassed || !input.labelPassed) {
    return "外观、封口和标签全部通过后才能放行";
  }
  const min = input.output.temperatureMin === null ? null : Number(input.output.temperatureMin);
  const max = input.output.temperatureMax === null ? null : Number(input.output.temperatureMax);
  if ((min !== null && measured < min) || (max !== null && measured > max)) {
    return `实测温度超出冻结范围（${outputTemperatureRange(input.output)}）`;
  }
  if (!input.locationId) return "请选择成品入库库位";
  return "";
}
