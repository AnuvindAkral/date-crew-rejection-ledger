"use strict";

// A tiny keyword heuristic that stands in for the model's "propose a dimension
// from free text" step. It maps rejection language to a dimension key. The
// prototype labels its output as a proposal that a human confirms; this function
// is deliberately not a model and must never be described as one.

const KEYWORD_MAP = [
  { re: /\b(relig|hind|muslim|sikh|christian|jain|parsi|cast(e)?|community|sect)\b/i, key: "religion_community" },
  { re: /\b(age|younger|older|years old|life stage|30s|40s|2[0-9]s|3[0-9]s)\b/i, key: "age_stage" },
  { re: /\b(college|degree|iit|iim|iim ?[abc]|mba|btech|mtech|institut|education|alum)\b/i, key: "education" },
  { re: /\b(profession|senior|job|role|career|engineer|doctor|founder|consultant|title)\b/i, key: "profession_seniority" },
  { re: /\b(income|salary|earn|financ|pay|money|lakh|crore|wealth)\b/i, key: "income_financial" },
  { re: /\b(locat|city|town|tier|metro|bangalore|mumbai|delhi|hyderabad|pune|chennai|relocat|move|abroad|base|settl|ncr|gurgaon|goa)\b/i, key: "location_city_tier" },
  { re: /\b(family|parent|mother|father|in-law|inlaws|joint family|sibling)\b/i, key: "family_parents" },
  { re: /\b(diet|vegetarian|non.?vegetarian|vegan|drink|smoke|lifestyle|gym|fitness|habits)\b/i, key: "diet_lifestyle" },
  { re: /\b(appearance|look|height|groom|physique|weight|dress|style)\b/i, key: "appearance_grooming" },
  { re: /\b(personality|temper|disposition|introvert|extrovert|ambitious|calm|anxious|temperament)\b/i, key: "personality_temperament" },
  { re: /\b(value|intent|marriage|serious|commit|kids|child|religion of values|ambition|goal)\b/i, key: "values_intent" },
  { re: /\b(divorce|marital|widow|widower|separat|previous marriage|history)\b/i, key: "marital_history" },
];

function suggestDimension(freeText) {
  if (!freeText || typeof freeText !== "string") return null;
  for (const entry of KEYWORD_MAP) {
    if (entry.re.test(freeText)) return entry.key;
  }
  return null;
}

module.exports = { suggestDimension };
