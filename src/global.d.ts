declare module "*.yaml" {
  const content: import("./providers/I18nContext").Translations;
  export default content;
}

declare module "*.yml" {
  const content: import("./providers/I18nContext").Translations;
  export default content;
}
