/*
 * Wishi configuration.
 * Edit this file to rename the site, change the default occasion or plug in real affiliate tags.
 */
window.GIFT_CONFIG = {
  // Shown in the header, footer and page title.
  siteName: "Wishi",

  // Occasion selected when the page first loads. Use an id from OCCASIONS in app.js
  // (birthday, christmas, anniversary, valentines, graduation, thanks, housewarming, justbecause)
  // or "" for none.
  defaultOccasion: "christmas",

  // Symbol shown before prices.
  currencySymbol: "€",

  // Where the chat sends messages. The Netlify redirect in netlify.toml points this to the serverless function.
  chatEndpoint: "", // portfolio embed: AI chat disabled, keyword matching only

  // Affiliate tags, one entry per store name used in data/products.json.
  // When "value" is not empty, "?param=value" is added to every outbound link for that store.
  // Leave the value empty until you have an approved affiliate account for that store.
  affiliate: {
    "Amazon":  { param: "tag", value: "" },   // TODO: Amazon Associates tag, e.g. "wishi-21"
    "Etsy":    { param: "ref", value: "" },   // TODO: Etsy affiliate id from your network (Awin)
    "Zalando": { param: "wt_mc", value: "" }  // TODO: Zalando partner tracking code
  }
};
