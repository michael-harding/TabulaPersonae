import { A } from "@solidjs/router"

export default function PrivacyPolicy() {
  return (
    <div class="max-w-2xl mx-auto px-4 py-8 space-y-6 text-sm text-foreground">
      <div>
        <A href="/auth" class="text-primary hover:underline text-xs">&larr; Back</A>
      </div>
      <h1 class="text-2xl font-bold">Privacy Policy</h1>
      <p class="text-muted-foreground">Effective date: May 19, 2026</p>

      <p>
        This Privacy Policy explains how Michael Harding ("I", "me"), operating TabulaPersonae ("the
        App"), collects, uses, and protects information when you use the service.
      </p>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">1. Using Without an Account</h2>
        <p>
          If you choose "Continue without account," no personal information is transmitted to our
          servers. All character data is stored exclusively in your browser's local storage and never
          leaves your device. However, standard server-side infrastructure logs (such as IP addresses
          and request timestamps) may still be recorded by the hosting provider as part of normal
          network operations.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">2. Information Collected for Account Holders</h2>
        <ul class="list-disc list-inside space-y-1 text-muted-foreground">
          <li>
            <strong>Account information:</strong> your email address, used for authentication via
            Firebase Authentication.
          </li>
          <li>
            <strong>Character data:</strong> any character sheets, notes, and related content you
            create, stored in Firebase Firestore under your account.
          </li>
          <li>
            <strong>Server logs:</strong> standard logs such as request timestamps and IP addresses,
            collected automatically by Firebase nad Netlify infrastructures.
          </li>
        </ul>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">3. Analytics</h2>
        <p>
          The App may use third-party analytics software (such as Google Analytics or Cloudflare
          Analytics) to collect anonymous, aggregated usage data — for example, page views and
          general traffic patterns. Any such data does not identify you personally. If analytics are
          added or changed, this policy will be updated with details of what is collected and by
          whom.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">4. How Your Information Is Used</h2>
        <p>Information is used solely to:</p>
        <ul class="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Provide, maintain, and improve the App</li>
          <li>Authenticate you and sync your data across devices</li>
          <li>Send password reset emails when requested</li>
          <li>Understand aggregate usage patterns to improve the service</li>
        </ul>
        <p>Personal information is not sold, rented, or shared with third parties for marketing purposes.</p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">5. Data Storage</h2>
        <p>
          Account data is stored using Google Firebase services, governed by Google's privacy
          practices. Users who choose "Continue without account" store data locally on their device
          only.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">6. Data Retention</h2>
        <p>
          We retain your data for as long as your account exists. You may delete your account and
          associated data at any time by contacting us.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">7. Security</h2>
        <p>
          We implement reasonable technical measures to protect your data. However, no transmission
          over the internet is completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">8. Children's Privacy</h2>
        <p>
          The App is not directed to children under 13. We do not knowingly collect personal
          information from children under 13.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by updating the effective date above.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold text-base">10. Contact</h2>
        <p>
          If you have questions about this Privacy Policy, please contact Michael Harding at the
          email address associated with the App.
        </p>
      </section>
    </div>
  )
}
