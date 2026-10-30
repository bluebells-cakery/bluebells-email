export type FormConfig = {
  heading: string; body: string; button: string; success: string; placeholder: string;
  askName: boolean; image: string | null; imageSide: "left" | "top" | "none";
  bg: string; text: string; buttonBg: string; buttonText: string; radius: number;
  trigger: "delay" | "scroll" | "exit"; delaySeconds: number; scrollPercent: number;
  showAgainDays: number; hideOnMobile: boolean; excludePaths: string; couponPool: string | null;
};
export const defaultConfig: FormConfig = {
  heading: "Get 10% off your first order", body: "Join the Bluebells family for new cakes, seasonal treats and the occasional sweet deal.", button: "Get my 10% off", success: "You're in! Check your inbox for your welcome offer.", placeholder: "Your email",
  askName: true, image: null, imageSide: "left",
  bg: "#fbe7e6", text: "#262967", buttonBg: "#262967", buttonText: "#ffffff", radius: 16,
  trigger: "delay", delaySeconds: 8, scrollPercent: 40, showAgainDays: 14, hideOnMobile: false, excludePaths: "/checkout, /cart, /account", couponPool: "WELCOME10",
};
