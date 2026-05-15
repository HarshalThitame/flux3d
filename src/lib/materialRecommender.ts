export const MATERIAL_USES = [
  'Decorative / Display',
  'Functional / Mechanical',
  'Outdoor Use',
  'Medical / Dental',
  'Gift / Corporate',
  'Student Project',
] as const

export const FINISH_PREFERENCES = [
  'Ultra fine detail (resin level)',
  'Clean and smooth (standard)',
  'Functional is fine, finish secondary',
] as const

export const BUDGET_RANGES = [
  'Under ₹10',
  '₹10–₹15',
  '₹15–₹20',
  '₹20+ — best quality',
] as const

export const ENVIRONMENT_CONDITIONS = [
  'Yes — high mechanical stress (gears, brackets, clips)',
  'Yes — high heat environment (near engines, sunlight, appliances)',
  'Yes — moisture or outdoor exposure',
  'No — indoor use only, no stress',
  'All of the above',
] as const

export type MaterialUse = (typeof MATERIAL_USES)[number]
export type FinishPreference = (typeof FINISH_PREFERENCES)[number]
export type BudgetRange = (typeof BUDGET_RANGES)[number]
export type EnvironmentCondition = (typeof ENVIRONMENT_CONDITIONS)[number]

export type MaterialQuizAnswers = {
  use: MaterialUse
  finish: FinishPreference
  budget: BudgetRange
  environment: EnvironmentCondition
}

export type MaterialQuizQuestion = {
  key: keyof MaterialQuizAnswers
  label: string
  options: readonly string[]
}

export const MATERIAL_QUIZ_QUESTIONS: readonly MaterialQuizQuestion[] = [
  {
    key: 'use',
    label: 'What is your print primarily for?',
    options: MATERIAL_USES,
  },
  {
    key: 'finish',
    label: 'How important is surface finish?',
    options: FINISH_PREFERENCES,
  },
  {
    key: 'budget',
    label: "What's your budget per gram?",
    options: BUDGET_RANGES,
  },
  {
    key: 'environment',
    label: 'Will this part face stress, heat, or moisture?',
    options: ENVIRONMENT_CONDITIONS,
  },
] as const

export type MaterialName = 'PLA' | 'PETG' | 'ABS' | 'ASA' | 'TPU' | 'Nylon' | 'Resin' | 'PC'
export type ResistanceRating = 'Low' | 'Medium' | 'High'
export type FinishRating = 'Basic' | 'Standard' | 'Premium'
export type FlexibilityRating = 'Rigid' | 'Semi-flexible' | 'Flexible'

export type MaterialRecommendationInfo = {
  name: MaterialName
  displayName: string
  materialId: string
  summary: string
  heatResistance: ResistanceRating
  strength: ResistanceRating
  surfaceFinish: FinishRating
  flexibility: FlexibilityRating
  priceRange: string
}

export type MaterialRecommendation = {
  material: MaterialRecommendationInfo
  reason: string
  notes: string[]
}

export type MaterialRecommendationResult = {
  primary: MaterialRecommendation
  secondary?: {
    material: MaterialRecommendationInfo
    tradeoff: string
  }
  warnings: string[]
}

const HIGH_STRESS = ENVIRONMENT_CONDITIONS[0]
const HIGH_HEAT = ENVIRONMENT_CONDITIONS[1]
const MOISTURE = ENVIRONMENT_CONDITIONS[2]
const NO_STRESS = ENVIRONMENT_CONDITIONS[3]
const ALL_CONDITIONS = ENVIRONMENT_CONDITIONS[4]

const MATERIALS: Record<MaterialName, MaterialRecommendationInfo> = {
  PLA: {
    name: 'PLA',
    displayName: 'PLA',
    materialId: 'pla',
    summary: 'Cheap, easy, clean finish, best for indoor display and student prints.',
    heatResistance: 'Low',
    strength: 'Low',
    surfaceFinish: 'Standard',
    flexibility: 'Rigid',
    priceRange: '₹3–₹10',
  },
  PETG: {
    name: 'PETG',
    displayName: 'PETG',
    materialId: 'petg',
    summary: 'Balanced toughness, moderate heat resistance, and light moisture resistance.',
    heatResistance: 'Medium',
    strength: 'High',
    surfaceFinish: 'Standard',
    flexibility: 'Semi-flexible',
    priceRange: '₹10–₹15',
  },
  ABS: {
    name: 'ABS',
    displayName: 'ABS',
    materialId: 'abs',
    summary: 'Tough and heat resistant for enclosed, functional parts.',
    heatResistance: 'High',
    strength: 'High',
    surfaceFinish: 'Standard',
    flexibility: 'Rigid',
    priceRange: '₹10–₹20',
  },
  ASA: {
    name: 'ASA',
    displayName: 'ASA',
    materialId: 'asa',
    summary: 'Outdoor grade material with UV, moisture, and heat resistance.',
    heatResistance: 'High',
    strength: 'High',
    surfaceFinish: 'Standard',
    flexibility: 'Rigid',
    priceRange: '₹15–₹20+',
  },
  TPU: {
    name: 'TPU',
    displayName: 'TPU',
    materialId: 'tpu',
    summary: 'Flexible, rubber-like material for impact absorption and bendable parts.',
    heatResistance: 'Medium',
    strength: 'Medium',
    surfaceFinish: 'Basic',
    flexibility: 'Flexible',
    priceRange: '₹15–₹20',
  },
  Nylon: {
    name: 'Nylon',
    displayName: 'Nylon',
    materialId: 'nylon',
    summary: 'Engineering-grade strength and fatigue resistance for demanding parts.',
    heatResistance: 'Medium',
    strength: 'High',
    surfaceFinish: 'Basic',
    flexibility: 'Semi-flexible',
    priceRange: '₹15–₹20+',
  },
  Resin: {
    name: 'Resin',
    displayName: 'Resin',
    materialId: 'resin',
    summary: 'Ultra fine detail and premium finish for visual or dental-style models.',
    heatResistance: 'Low',
    strength: 'Low',
    surfaceFinish: 'Premium',
    flexibility: 'Rigid',
    priceRange: '₹15–₹20+',
  },
  PC: {
    name: 'PC',
    displayName: 'PC (Polycarbonate)',
    materialId: 'pc',
    summary: 'Premium material with the highest heat and impact resistance.',
    heatResistance: 'High',
    strength: 'High',
    surfaceFinish: 'Standard',
    flexibility: 'Rigid',
    priceRange: '₹20+',
  },
}

const TRADEOFFS: Record<MaterialName, string> = {
  PLA: 'lowest cost and clean finish, but avoid heat, moisture, and load-bearing use',
  PETG: 'tougher than PLA and easier than ABS, but not as heat resistant',
  ABS: 'more heat resistant than PETG, but needs enclosure and ventilation',
  ASA: 'best outdoors, but costs more and needs a controlled print setup',
  TPU: 'best for bendable or shock-absorbing parts, not rigid brackets or gears',
  Nylon: 'stronger for rigid functional parts, but absorbs moisture over time',
  Resin: 'best detail and finish, but brittle for functional use',
  PC: 'best heat and impact resistance, but premium and harder to print',
}

function isBudgetUnder15(budget: BudgetRange) {
  return budget === 'Under ₹10' || budget === '₹10–₹15'
}

function isBudget10To20(budget: BudgetRange) {
  return budget === '₹10–₹15' || budget === '₹15–₹20'
}

function isBudget15Plus(budget: BudgetRange) {
  return budget === '₹15–₹20' || budget === '₹20+ — best quality'
}

function makeRecommendation(materialName: MaterialName, answers: MaterialQuizAnswers): MaterialRecommendation {
  const material = MATERIALS[materialName]
  const notes =
    materialName === 'TPU'
      ? ['Best if your part needs to bend or absorb shock.']
      : []

  return {
    material,
    reason: buildReason(materialName, answers),
    notes,
  }
}

function buildReason(materialName: MaterialName, answers: MaterialQuizAnswers) {
  const { use, finish, budget } = answers

  if (materialName === 'Resin') {
    return `${finish.toLowerCase()} is the main requirement, and ${use.toLowerCase()} parts benefit from resin-level detail.`
  }

  if (materialName === 'TPU') {
    return `${use.toLowerCase()} parts facing mechanical stress may need impact absorption or controlled flex.`
  }

  if (materialName === 'Nylon') {
    return `${use.toLowerCase()} with high stress needs engineering-grade strength within your ${budget} budget.`
  }

  if (materialName === 'PC') {
    return `your part may face high heat, and your ${budget} budget supports a premium engineering material.`
  }

  if (materialName === 'ASA') {
    return `your answers point to outdoor, UV, moisture, or all-weather exposure.`
  }

  if (materialName === 'ABS') {
    return `your part needs heat resistance without outdoor UV exposure, and ${budget} fits ABS.`
  }

  if (materialName === 'PETG') {
    return `${use.toLowerCase()} needs a durable, practical material with moderate moisture resistance.`
  }

  return `${use.toLowerCase()} is indoor, low-stress, and budget-sensitive, where PLA is the most efficient choice.`
}

function directRecommendation(answers: MaterialQuizAnswers): MaterialName | null {
  const { use, finish, budget, environment } = answers

  if (
    finish === 'Ultra fine detail (resin level)' &&
    (use === 'Decorative / Display' || use === 'Gift / Corporate' || use === 'Medical / Dental')
  ) {
    return 'Resin'
  }

  if (use === 'Functional / Mechanical' && environment === HIGH_STRESS) {
    return 'TPU'
  }

  if (
    (use === 'Functional / Mechanical' || use === 'Medical / Dental') &&
    (environment === HIGH_STRESS || environment === ALL_CONDITIONS) &&
    isBudget15Plus(budget)
  ) {
    return 'Nylon'
  }

  if (
    (environment === HIGH_HEAT || environment === ALL_CONDITIONS) &&
    use === 'Functional / Mechanical' &&
    budget === '₹20+ — best quality'
  ) {
    return 'PC'
  }

  if (
    (use === 'Outdoor Use' || environment === MOISTURE || environment === ALL_CONDITIONS) &&
    isBudget15Plus(budget)
  ) {
    return 'ASA'
  }

  if (environment === HIGH_HEAT && isBudget10To20(budget) && use !== 'Outdoor Use') {
    return 'ABS'
  }

  if (
    (use === 'Functional / Mechanical' || use === 'Student Project') &&
    (environment === MOISTURE || environment === NO_STRESS) &&
    isBudget10To20(budget)
  ) {
    return 'PETG'
  }

  if (
    (use === 'Decorative / Display' || use === 'Gift / Corporate' || use === 'Student Project') &&
    environment === NO_STRESS &&
    (finish === 'Clean and smooth (standard)' || finish === 'Functional is fine, finish secondary') &&
    isBudgetUnder15(budget)
  ) {
    return 'PLA'
  }

  return null
}

function scoreMaterial(materialName: MaterialName, answers: MaterialQuizAnswers) {
  const { use, finish, budget, environment } = answers
  let score = 0

  switch (materialName) {
    case 'Resin':
      if (finish === 'Ultra fine detail (resin level)') score += 4
      if (use === 'Decorative / Display' || use === 'Gift / Corporate' || use === 'Medical / Dental') score += 3
      if (environment === NO_STRESS) score += 1
      if (use === 'Functional / Mechanical' || environment === HIGH_STRESS || environment === ALL_CONDITIONS) score -= 2
      break
    case 'TPU':
      if (environment === HIGH_STRESS) score += 4
      if (use === 'Functional / Mechanical') score += 3
      if (finish === 'Functional is fine, finish secondary') score += 1
      if (isBudget15Plus(budget)) score += 1
      break
    case 'Nylon':
      if (environment === HIGH_STRESS || environment === ALL_CONDITIONS) score += 4
      if (use === 'Functional / Mechanical' || use === 'Medical / Dental') score += 3
      if (isBudget15Plus(budget)) score += 2
      break
    case 'PC':
      if (environment === HIGH_HEAT || environment === ALL_CONDITIONS) score += 4
      if (use === 'Functional / Mechanical') score += 3
      if (budget === '₹20+ — best quality') score += 3
      break
    case 'ASA':
      if (use === 'Outdoor Use' || environment === MOISTURE || environment === ALL_CONDITIONS) score += 5
      if (isBudget15Plus(budget)) score += 2
      if (environment === HIGH_HEAT) score += 1
      break
    case 'ABS':
      if (environment === HIGH_HEAT) score += 4
      if (isBudget10To20(budget)) score += 2
      if (use === 'Functional / Mechanical') score += 2
      if (use === 'Outdoor Use') score -= 3
      break
    case 'PETG':
      if (use === 'Functional / Mechanical' || use === 'Student Project') score += 3
      if (environment === MOISTURE || environment === NO_STRESS) score += 3
      if (isBudget10To20(budget)) score += 2
      if (finish !== 'Ultra fine detail (resin level)') score += 1
      break
    case 'PLA':
      if (use === 'Decorative / Display' || use === 'Gift / Corporate' || use === 'Student Project') score += 3
      if (environment === NO_STRESS) score += 3
      if (isBudgetUnder15(budget)) score += 3
      if (finish !== 'Ultra fine detail (resin level)') score += 1
      break
  }

  return score
}

function getWarnings(primary: MaterialName) {
  if (primary === 'ABS') {
    return ['ABS requires an enclosed printer and good ventilation. Confirm with us before ordering.']
  }
  if (primary === 'Resin') {
    return ['Resin parts are brittle and not suitable for functional or load-bearing use.']
  }
  if (primary === 'Nylon') {
    return ['Nylon absorbs moisture over time. Store finished parts in a dry environment.']
  }
  if (primary === 'PC') {
    return ['Polycarbonate is our premium material. Lead time may be longer.']
  }
  return []
}

function getSecondary(primary: MaterialName, answers: MaterialQuizAnswers, tiedMaterial?: MaterialName) {
  const secondaryName =
    tiedMaterial ??
    (primary === 'ABS'
      ? 'PETG'
      : primary === 'TPU'
        ? 'Nylon'
        : primary === 'PLA'
          ? 'PETG'
          : primary === 'ASA' && answers.budget === '₹20+ — best quality'
            ? 'PC'
            : null)

  if (!secondaryName) return undefined

  return {
    material: MATERIALS[secondaryName],
    tradeoff: TRADEOFFS[secondaryName],
  }
}

export function recommendMaterial(answers: MaterialQuizAnswers): MaterialRecommendationResult {
  const direct = directRecommendation(answers)

  if (direct) {
    return {
      primary: makeRecommendation(direct, answers),
      secondary: getSecondary(direct, answers),
      warnings: getWarnings(direct),
    }
  }

  const ranked = (Object.keys(MATERIALS) as MaterialName[])
    .map((materialName) => ({
      materialName,
      score: scoreMaterial(materialName, answers),
    }))
    .sort((left, right) => right.score - left.score)

  const primaryName = ranked[0]?.materialName ?? 'PLA'
  const secondaryTie = ranked[1] && ranked[1].score === ranked[0]?.score ? ranked[1].materialName : undefined

  return {
    primary: makeRecommendation(primaryName, answers),
    secondary: getSecondary(primaryName, answers, secondaryTie),
    warnings: getWarnings(primaryName),
  }
}
