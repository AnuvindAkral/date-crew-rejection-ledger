"use strict";

// Fixed rejection-reason vocabulary. Each entry has a key, a display label and a
// one-line definition the matchmaker sees on hover. This is the only source of
// dimension identity in the prototype.

const DIMENSIONS = [
  { key: "religion_community", label: "Religion or community", hint: "Faith, community or sect the client cares about" },
  { key: "age_stage", label: "Age or life stage", hint: "Age band, or where someone is in life" },
  { key: "education", label: "Education", hint: "College, degree or institution" },
  { key: "profession_seniority", label: "Profession or seniority", hint: "Field, role or seniority level" },
  { key: "income_financial", label: "Income or finances", hint: "Earning level or financial situation" },
  { key: "location_city_tier", label: "Location or city tier", hint: "City, or willingness to relocate" },
  { key: "family_parents", label: "Family or parents", hint: "Family situation or parental expectations" },
  { key: "diet_lifestyle", label: "Diet or lifestyle", hint: "Diet, habits or day to day lifestyle" },
  { key: "appearance_grooming", label: "Appearance or grooming", hint: "How someone presents themselves" },
  { key: "personality_temperament", label: "Personality or temperament", hint: "Disposition and temperament" },
  { key: "values_intent", label: "Values or intent", hint: "Core values or relationship intent" },
  { key: "marital_history", label: "Marital history", hint: "Relationship or marital history" },
];

const DIMENSION_BY_KEY = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));

function dimensionLabel(key) {
  const d = DIMENSION_BY_KEY[key];
  return d ? d.label : key;
}

// Severity vocabulary. A matchmaker may record likely-dealbreaker, preference or
// uncertain. Nothing here is a confirmed dealbreaker; confirmation is a separate
// client action, never a matchmaker click.
const SEVERITIES = ["likely_dealbreaker", "preference", "uncertain"];

module.exports = { DIMENSIONS, DIMENSION_BY_KEY, dimensionLabel, SEVERITIES };
