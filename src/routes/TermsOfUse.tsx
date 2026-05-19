import { A } from "@solidjs/router"

export default function TermsOfUse() {
  return (
    <div class="max-w-2xl mx-auto px-4 py-8 space-y-6 text-sm text-foreground">
      <div>
        <A href="/auth" class="text-primary hover:underline text-xs">&larr; Back</A>
      </div>
      <h1 class="text-2xl font-bold">Terms of Use</h1>
      <p class="text-muted-foreground">Effective date: May 19, 2026</p>

      <p>
        Welcome to TabulaPersonae ("the App"), operated by Michael Harding. By creating an account
        or using the App, you agree to these Terms of Use. If you do not agree, do not use the App.
      </p>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">1. Use of the App</h2>
        <p>
          TabulaPersonae is a personal character management tool for tabletop roleplaying games. You
          may use the App for personal, non-commercial purposes. You are responsible for all activity
          under your account.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">2. Accounts</h2>
        <p>
          You must provide a valid email address to register. You are responsible for maintaining the
          confidentiality of your password. We reserve the right to suspend or delete accounts that
          violate these terms.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">3. User Content</h2>
        <p>
          You retain ownership of any character data you create. By using the App you grant us a
          limited license to store and display that data solely to provide the service to you.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">4. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul class="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Use the App for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to any part of the App</li>
          <li>Upload malicious code or content</li>
        </ul>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">5. Disclaimer of Warranties</h2>
        <p>
          The App is provided "as is" without warranties of any kind. We do not guarantee
          uninterrupted access or that data will never be lost.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">6. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
          consequential damages arising from your use of the App.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">7. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the App after changes
          constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">8. Contact</h2>
        <p>
          Questions about these Terms can be sent to Michael Harding at the email address associated
          with the App.
        </p>
      </section>
    </div>
  )
}
