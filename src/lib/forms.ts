export type FormConfig = {
  showLogo: boolean; intro: string; offer: string; finePrint: string; dismissText: string;
  heading: string; body: string; button: string; success: string; placeholder: string;
  askName: boolean; image: string | null; imageSide: "left" | "top" | "none";
  bg: string; text: string; buttonBg: string; buttonText: string; radius: number;
  trigger: "delay" | "scroll" | "exit"; delaySeconds: number; scrollPercent: number;
  showAgainDays: number; hideOnMobile: boolean; excludePaths: string; couponPool: string | null;
};
export const defaultConfig: FormConfig = {
  showLogo: true, intro: "Subscribe to our email newsletter to receive a", offer: "10% OFF", finePrint: "* Ts and Cs apply. This offer is only available to new email subscribers who haven't ordered from us online.", dismissText: "No, thanks",
  heading: "", body: "coupon code, that will be emailed to you and can be used on your first online order!", button: "Sign me up!", success: "You're in! Your 10% off code is on its way to your inbox.", placeholder: "Email",
  askName: false, image: "https://cdn.shopify.com/s/files/1/0884/4436/files/07092617812_7bcc799c-cbe0-42fe-9ee2-ef647c0a3bb2.jpg", imageSide: "left",
  bg: "#fcf0f4", text: "#262967", buttonBg: "#f6c6d6", buttonText: "#262967", radius: 12,
  trigger: "delay", delaySeconds: 8, scrollPercent: 40, showAgainDays: 14, hideOnMobile: false, excludePaths: "/checkout, /cart, /account", couponPool: "WELCOME10",
};
