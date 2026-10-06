import { SignupForm } from "@/components/feature/auth/signup-form";
import { FingerprintCookieWriter } from "@/components/feature/auth/fingerprint-cookie-writer";

export default function SignupPage() {
  return (
    <>
      <FingerprintCookieWriter />
      <SignupForm />
    </>
  );
}
