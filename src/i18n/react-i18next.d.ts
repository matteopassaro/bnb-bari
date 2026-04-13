import "i18next";
import common from "./locales/it/common.json";
import home from "./locales/it/home.json";
import booking from "./locales/it/booking.json";
import nav from "./locales/it/nav.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    ns: ["common", "home", "booking", "nav"];
    resources: {
      common: typeof common;
      home: typeof home;
      booking: typeof booking;
      nav: typeof nav;
    };
  }
}
