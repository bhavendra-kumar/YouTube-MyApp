declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve(true);

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function ensureRazorpayLoaded(): Promise<boolean> {
  return loadScript("https://checkout.razorpay.com/v1/checkout.js");
}
