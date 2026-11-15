"use client";

import { LogInIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { z } from "zod";

import { authClient } from "@/components/auth-client";
import { FieldError } from "@/components/field-error";
import { FormAlert } from "@/components/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The sign-in buttons on Welcome: Continue with Google, and, only when it is on,
// the development sign-in (docs/03-ARCHITECTURE.md, section 3).

function GoogleMark() {
  // Google's "G", drawn here because lucide-react has no brand logos.
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path
        fill="#4285F4"
        d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z"
      />
    </svg>
  );
}

export function WelcomeActions({
  google,
  devSignIn,
  signInError,
  returnTo = "/",
}: {
  google: boolean;
  devSignIn: boolean;
  signInError: boolean;
  /** Where Google sign-in comes back to: Welcome, or an invitation (flow C). */
  returnTo?: string;
}) {
  const t = useTranslations("welcome");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(signInError);

  async function continueWithGoogle() {
    setPending(true);
    setFailed(false);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: returnTo,
      errorCallbackURL: `${returnTo}?error=sign-in`,
    });
    if (error) {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      {failed && <FormAlert>{t("signInError")}</FormAlert>}
      {google && (
        <Button
          variant="secondary"
          className="min-h-13 w-full"
          disabled={pending}
          onClick={continueWithGoogle}
        >
          <GoogleMark />
          {pending ? t("signingIn") : t("continueWithGoogle")}
        </Button>
      )}
      {!google && !devSignIn && (
        <p className="text-body-md text-muted-foreground">
          {t("signInUnavailable")}
        </p>
      )}
      {devSignIn && <DevSignInForm />}
    </div>
  );
}

const emailSchema = z.email();

function DevSignInForm() {
  const t = useTranslations("devSignIn");
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!emailSchema.safeParse(email.trim()).success) {
      setInvalid(true);
      return;
    }
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch("/api/auth/dev/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(String(response.status));
      // Welcome, rendered again with the new session, sends the user on.
      router.refresh();
    } catch {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby={`${id}-title`}
      className="border-input flex flex-col gap-3 rounded-lg border-2 border-dashed p-4"
    >
      <h2 id={`${id}-title`} className="text-headline-md font-semibold">
        {t("title")}
      </h2>
      <p className="text-body-md text-muted-foreground">{t("description")}</p>
      {failed && <FormAlert>{t("failed")}</FormAlert>}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-email`}>{t("email")}</Label>
        <Input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setInvalid(false);
          }}
        />
        {invalid && (
          <FieldError id={`${id}-error`}>{t("invalidEmail")}</FieldError>
        )}
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        <LogInIcon aria-hidden />
        {t("submit")}
      </Button>
    </form>
  );
}
