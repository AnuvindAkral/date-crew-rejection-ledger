"use strict";

// The fixed rejection vocabulary. Each dimension carries the values a matchmaker
// can actually record, so a preference and a candidate attribute can be compared
// as values rather than as categories. Comparing categories only tells you that
// both sides have something to say about location, not that the locations match.

const DIMENSIONS = [
  {
    key: "religion_community",
    label: "Religion or community",
    hint: "Faith, community or sect the client cares about",
    values: ["Hindu", "Muslim", "Sikh", "Christian", "Jain", "Parsi", "Buddhist", "Other"],
  },
  {
    key: "age_stage",
    label: "Age or life stage",
    hint: "Age band, or where someone is in life",
    values: ["25 to 29", "30 to 34", "35 to 39", "40 and over"],
  },
  {
    key: "education",
    label: "Education",
    hint: "College, degree or institution",
    values: ["Top-tier college", "Tier 2 college", "Professional degree", "Doctorate"],
  },
  {
    key: "profession_seniority",
    label: "Profession or seniority",
    hint: "Field, role or seniority level",
    values: ["Founder or business owner", "Senior professional", "Mid-career", "Early career"],
  },
  {
    key: "income_financial",
    label: "Income or finances",
    hint: "Earning level or financial situation",
    values: ["15 lakh and above", "8 to 15 lakh", "Below 8 lakh", "Not disclosed"],
  },
  {
    key: "location_city_tier",
    label: "Location or city tier",
    hint: "City, or willingness to relocate",
    values: ["Bangalore metro", "Delhi NCR", "Mumbai", "Pune", "Other metro", "Tier 2 city", "Abroad"],
  },
  {
    key: "family_parents",
    label: "Family or parents",
    hint: "Family situation or parental expectations",
    values: ["Joint family", "Nuclear family", "Separated", "No family involvement"],
  },
  {
    key: "diet_lifestyle",
    label: "Diet or lifestyle",
    hint: "Diet, habits or day to day lifestyle",
    values: ["Vegetarian", "Non-vegetarian", "Vegan", "Eggetarian"],
  },
  {
    key: "smoking_habit",
    label: "Smoking",
    hint: "Whether the person smokes",
    values: ["Non-smoker", "Occasional smoker", "Regular smoker"],
  },
  {
    key: "appearance_grooming",
    label: "Appearance or grooming",
    hint: "How someone presents themselves",
    values: ["Conventionally attractive", "Average", "Unclear"],
  },
  {
    key: "personality_temperament",
    label: "Personality or temperament",
    hint: "Disposition and temperament",
    values: ["Calm", "Warm", "Outgoing", "Reserved"],
  },
  {
    key: "values_intent",
    label: "Values or intent",
    hint: "Core values, children, religion of values",
    values: ["Wants children", "Does not want children", "Unsure about children", "Spiritually inclined"],
  },
  {
    key: "marital_history",
    label: "Marital history",
    hint: "Relationship or marital history",
    values: ["Never married", "Divorced", "Widowed"],
  },
];

const DIMENSION_BY_KEY = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));

function dimensionLabel(key) {
  const d = DIMENSION_BY_KEY[key];
  return d ? d.label : key;
}

function dimensionValues(key) {
  const d = DIMENSION_BY_KEY[key];
  return d ? d.values : [];
}

module.exports = { DIMENSIONS, DIMENSION_BY_KEY, dimensionLabel, dimensionValues };
