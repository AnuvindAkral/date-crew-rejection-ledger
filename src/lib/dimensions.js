"use strict";

// The fixed rejection vocabulary.
//
// Each dimension carries the values a matchmaker can record, plus three things
// that exist only to let the interface speak plainly:
//
//   label    what the matchmaker calls this dimension
//   noun     the short form used inside a sentence, as in "because of smoking"
//   phrase   a template for one candidate, as in "a partner who is a {v}"
//
// The phrase templates are what let a criterion read as a sentence rather than
// as a comparison, and they are written so that every one of that dimension's
// values fits. The few that do not have their own override.
//
// A value that is a common noun is lower-cased in a sentence. A place or a
// community keeps the form it was recorded in, because "Bangalore metro" and
// "Hindu" are not things you lower-case mid-sentence.

const DIMENSIONS = [
  {
    key: "religion_community",
    label: "Religion and community",
    hint: "Faith, community or sect the client cares about",
    question: "What matters to you about religion or community?",
    noun: "religion",
    phrase: "a partner who is {v}",
    lower: false,
    values: ["Hindu", "Muslim", "Sikh", "Christian", "Jain", "Parsi", "Buddhist", "Other"],
    phrases: { Other: "a partner from another community" },
  },
  {
    key: "age_stage",
    label: "Age",
    hint: "Age band, or where someone is in life",
    question: "What age range would you consider for a potential match?",
    noun: "age",
    phrase: "someone in the {v} age band",
    lower: false,
    values: ["25 to 29", "30 to 34", "35 to 39", "40 and over"],
  },
  {
    key: "education",
    label: "Education",
    hint: "College, degree or institution",
    question: "What level of education would you consider?",
    noun: "education",
    phrase: "a {v} background",
    lower: true,
    values: ["Top-tier college", "Tier 2 college", "Professional degree", "Doctorate"],
  },
  {
    key: "profession_seniority",
    label: "Job",
    hint: "Field, role or seniority level",
    question: "What kind of work would you consider?",
    noun: "their job",
    phrase: "a {v} career",
    lower: true,
    values: ["Founder or business owner", "Senior professional", "Mid-career", "Early career"],
  },
  {
    key: "income_financial",
    label: "Income",
    hint: "Earning level or financial situation",
    question: "What income would you consider?",
    noun: "income",
    phrase: "an income of {v}",
    lower: true,
    values: ["15 lakh and above", "8 to 15 lakh", "Below 8 lakh", "Not disclosed"],
  },
  {
    key: "location_city_tier",
    label: "Location",
    hint: "City, or willingness to relocate",
    question: "What locations would you consider for a potential match?",
    noun: "location",
    phrase: "a partner based in {v}",
    lower: false,
    values: ["Bangalore metro", "Delhi NCR", "Mumbai", "Pune", "Other metro", "Tier 2 city", "Abroad"],
  },
  {
    key: "family_parents",
    label: "Family",
    hint: "Family situation or parental expectations",
    question: "What are your expectations about family?",
    noun: "family",
    phrase: "a {v} family",
    lower: true,
    values: ["Joint family", "Nuclear family", "Separated", "No family involvement"],
    phrases: {
      "Joint family": "someone from a joint family",
      "Nuclear family": "someone from a nuclear family",
      Separated: "someone from a separated family",
      "No family involvement": "someone whose family is not involved",
    },
  },
  {
    key: "diet_lifestyle",
    label: "Diet",
    hint: "Diet, habits or day to day lifestyle",
    question: "What diet would you consider for a potential match?",
    noun: "diet",
    phrase: "a partner whose diet is {v}",
    lower: true,
    values: ["Vegetarian", "Non-vegetarian", "Vegan", "Eggetarian"],
  },
  {
    key: "smoking_habit",
    label: "Smoking",
    hint: "Whether the person smokes",
    question: "What is your view on smoking?",
    noun: "smoking",
    phrase: "a partner who is a {v}",
    lower: true,
    values: ["Non-smoker", "Occasional smoker", "Regular smoker"],
    phrases: { "Occasional smoker": "a partner who is an occasional smoker" },
  },
  {
    key: "appearance_grooming",
    label: "Appearance",
    hint: "How someone presents themselves",
    question: "What matters to you about appearance?",
    noun: "appearance",
    phrase: "a partner who is {v}",
    lower: true,
    values: ["Conventionally attractive", "Average", "Unclear"],
  },
  {
    key: "personality_temperament",
    label: "Personality",
    hint: "Disposition and temperament",
    question: "What kind of person would you consider?",
    noun: "personality",
    phrase: "a partner who is {v}",
    lower: true,
    values: ["Calm", "Warm", "Outgoing", "Reserved"],
  },
  {
    key: "values_intent",
    label: "Children and values",
    hint: "Core values, children, religion of values",
    question: "What are you looking for around children?",
    noun: "children",
    phrase: "a partner who {v}",
    lower: true,
    values: ["Wants children", "Does not want children", "Unsure about children", "Spiritually inclined"],
    phrases: {
      "Unsure about children": "a partner who is unsure about children",
      "Spiritually inclined": "a partner who is spiritually inclined",
    },
  },
  {
    key: "marital_history",
    label: "Marital history",
    hint: "Relationship or marital history",
    question: "What matters to you about marital history?",
    noun: "marital history",
    phrase: "a {v} partner",
    lower: true,
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

function dimensionNoun(key) {
  const d = DIMENSION_BY_KEY[key];
  return d ? d.noun : key;
}

// How a value reads inside a sentence. Common nouns are lower-cased, place and
// community names keep the form they were recorded in.
function displayValue(key, value) {
  const d = DIMENSION_BY_KEY[key];
  if (!d || value === null || value === undefined) return value;
  if (!d.lower) return value;
  return String(value).charAt(0).toLowerCase() + String(value).slice(1);
}

// A phrase describing one candidate, for example "a partner who is a regular
// smoker". Falls back to the raw value when the dimension has no template.
function valuePhrase(key, value) {
  const d = DIMENSION_BY_KEY[key];
  if (!d || value === null || value === undefined) return String(value);
  const override = d.phrases && d.phrases[value];
  if (override) return override;
  const shown = displayValue(key, value);
  return d.phrase ? d.phrase.replace("{v}", shown) : shown;
}

module.exports = {
  DIMENSIONS,
  DIMENSION_BY_KEY,
  dimensionLabel,
  dimensionValues,
  dimensionNoun,
  displayValue,
  valuePhrase,
};
