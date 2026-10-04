import type { ParsedModel, QuoteConfig } from '@/lib/quote/types'

export const DEFAULT_QUOTE_SCALE = {
  minPercent: 25,
  maxPercent: 200,
  defaultPercent: 100,
  stepPercent: 5,
} as const

export const STANDARD_QUOTE_BUILD_VOLUME_MM = {
  x: 220,
  y: 220,
  z: 250,
} as const

export type QuoteScaleSettings = {
  quoteScaleMinPercent?: number
  quoteScaleMaxPercent?: number
  quoteScaleDefaultPercent?: number
  quoteScaleStepPercent?: number
}

function finite(value: unknown, fallback: number) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function getQuoteScaleSettings(settings?: QuoteScaleSettings) {
  const minPercent = Math.max(1, finite(settings?.quoteScaleMinPercent, DEFAULT_QUOTE_SCALE.minPercent))
  const maxPercent = Math.max(minPercent, finite(settings?.quoteScaleMaxPercent, DEFAULT_QUOTE_SCALE.maxPercent))
  const stepPercent = Math.max(0.01, finite(settings?.quoteScaleStepPercent, DEFAULT_QUOTE_SCALE.stepPercent))
  const requestedDefault = finite(settings?.quoteScaleDefaultPercent, DEFAULT_QUOTE_SCALE.defaultPercent)
  const defaultPercent = Math.min(maxPercent, Math.max(minPercent, requestedDefault))
  return { minPercent, maxPercent, defaultPercent, stepPercent }
}

export function normalizeQuoteScale(scalePercent: unknown, settings?: QuoteScaleSettings) {
  const limits = getQuoteScaleSettings(settings)
  const requested = finite(scalePercent, limits.defaultPercent)
  const clamped = Math.min(limits.maxPercent, Math.max(limits.minPercent, requested))
  const stepped = limits.minPercent + Math.round((clamped - limits.minPercent) / limits.stepPercent) * limits.stepPercent
  return Math.round(Math.min(limits.maxPercent, Math.max(limits.minPercent, stepped)) * 100) / 100
}

/** Whether a requested scale is an exact, permitted value for the active admin range. */
export function isQuoteScaleAllowed(scalePercent: unknown, settings?: QuoteScaleSettings) {
  const requested = Number(scalePercent)
  if (!Number.isFinite(requested)) return false

  const limits = getQuoteScaleSettings(settings)
  if (requested < limits.minPercent || requested > limits.maxPercent) return false

  return Math.abs(requested - normalizeQuoteScale(requested, settings)) < 0.000001
}

export function scaleFactorFromConfig(config: Pick<QuoteConfig, 'scalePercent'>, settings?: QuoteScaleSettings) {
  return normalizeQuoteScale(config.scalePercent, settings) / 100
}

export function exceedsStandardQuoteBuildVolume(
  dimensionsMm: ParsedModel['dimensionsMm'],
  config: Pick<QuoteConfig, 'scalePercent'>,
  settings?: QuoteScaleSettings,
) {
  const factor = scaleFactorFromConfig(config, settings)
  return (
    dimensionsMm.x * factor > STANDARD_QUOTE_BUILD_VOLUME_MM.x ||
    dimensionsMm.y * factor > STANDARD_QUOTE_BUILD_VOLUME_MM.y ||
    dimensionsMm.z * factor > STANDARD_QUOTE_BUILD_VOLUME_MM.z
  )
}

/** Returns manufacturing metadata at the requested uniform scale without mutating the preview object. */
export function scaleModelForQuote(model: ParsedModel, config: Pick<QuoteConfig, 'scalePercent'>, settings?: QuoteScaleSettings): ParsedModel {
  const factor = scaleFactorFromConfig(config, settings)
  return {
    ...model,
    dimensionsMm: {
      x: model.dimensionsMm.x * factor,
      y: model.dimensionsMm.y * factor,
      z: model.dimensionsMm.z * factor,
    },
    volumeMm3: model.volumeMm3 * factor ** 3,
    surfaceAreaMm2: model.surfaceAreaMm2 * factor ** 2,
    supportVolumeMm3: model.supportVolumeMm3 * factor ** 3,
  }
}
