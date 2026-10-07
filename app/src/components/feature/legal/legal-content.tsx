import * as React from "react";
import { Link } from "@/i18n/navigation";

export type Section = { id: string; title: string; body: React.ReactNode };

export const TERMS_SECTIONS: Section[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of these Terms",
    body: (
      <>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of
          PromtExpress (&quot;Service&quot;), operated by <strong>Hakan Güven</strong>{" "}
          (sole trader, Turkey), trading as <strong>Promtexpress</strong>. By creating
          an account, accessing, or using the Service you agree to be bound by these
          Terms. If you do not agree, do not use the Service.
        </p>
        <p>
          The Service is offered through{" "}
          <a href="https://promtexpress.com" className="text-primary hover:underline">
            promtexpress.com
          </a>{" "}
          and related subdomains. We may update these Terms from time to time;
          material changes will be announced on this page with a new &quot;Last
          updated&quot; date and, where required, by email notice.
        </p>
      </>
    ),
  },
  {
    id: "service-description",
    title: "2. Description of the Service",
    body: (
      <>
        <p>
          PromtExpress is a software-as-a-service tool that helps users transform
          plain-language intent into engineered prompts for third-party generative AI
          systems. The Service does not generate end deliverables; it produces prompt
          text that the user may submit to AI engines of their choice.
        </p>
        <p>
          PromtExpress is free to use. Prompts are generated with an AI provider API key
          that you add to your account; your provider bills you for that usage directly.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "3. Account terms",
    body: (
      <>
        <p>
          You must be at least 18 years old, or the age of majority in your
          jurisdiction, to create an account. Account credentials are personal and
          non-transferable. You are responsible for activity under your account and
          for keeping login credentials secure.
        </p>
        <p>
          We may suspend or terminate accounts that violate these Terms, abuse the
          Service, or breach applicable law. You may close your account at any time
          from <Link href="/settings" className="text-primary hover:underline">Settings</Link>.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "4. Acceptable use",
    body: (
      <>
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>generate content that infringes intellectual property rights;</li>
          <li>
            produce sexual content involving minors, content inciting violence,
            harassment, or hatred against protected groups;
          </li>
          <li>
            attempt to circumvent rate limits, security controls, or our
            authentication mechanisms;
          </li>
          <li>resell, sublicense, or rebrand the Service without written consent;</li>
          <li>scrape, mass-export, or train competing models on our outputs;</li>
          <li>
            transmit malware, spam, or material that violates the laws of Turkey or of
            the user&apos;s jurisdiction.
          </li>
        </ul>
        <p className="mt-3">
          We reserve the right to remove content and limit or terminate accounts that
          violate this section.
        </p>
      </>
    ),
  },
  {
    id: "payment",
    title: "5. Price",
    body: (
      <>
        <p>
          PromtExpress is free. There are no plans, subscriptions, or credits, and we
          do not take payments.
        </p>
        <p>
          Generation runs on an AI provider API key that you add to your account. Any
          usage charges are billed to you by that provider under your own agreement
          with them; we do not receive any part of them.
        </p>
        <p>
          Purchases made before October 2026, when the Service still offered paid
          credit packs, were processed by Paddle.com Market Limited as Merchant of
          Record. For any question about such a purchase, contact us at the address
          in the Contact section.
        </p>
      </>
    ),
  },
  {
    id: "ai-keys",
    title: "6. Your AI provider keys",
    body: (
      <>
        <p>
          To generate prompts you add an API key from a supported AI provider. You
          are responsible for that key, for your account with the provider, for the
          charges it incurs, and for complying with the provider&apos;s terms.
        </p>
        <p>
          We store your keys encrypted and use them only to run the generations you
          request. Keys are never displayed again after you save them. You can remove
          a key at any time in Settings, and your keys are deleted when you delete
          your account.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "7. Intellectual property",
    body: (
      <>
        <p>
          The Service, including its software, design, logos, and documentation, is
          owned by Hakan Güven and protected by copyright and other laws. We grant
          you a limited, revocable, non-exclusive, non-transferable license to use the
          Service in accordance with these Terms.
        </p>
        <p>
          You retain ownership of the prompts and any inputs you submit. You also
          retain rights, to the extent legally available, to the prompts generated for
          you by the Service. Note that text generated by an AI system is not
          automatically copyrightable in many jurisdictions; we make no warranty as to
          IP status of AI outputs.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "8. Third-party AI providers",
    body: (
      <p>
        The Service sends the text you submit to the AI provider whose API key is
        active on your account (for example OpenAI, Anthropic, Google, DeepSeek, or
        OpenRouter) in order to analyse your intent and write the prompt. That
        provider processes the request under your own account and agreement with
        them. We do not warrant the availability or output of any third-party model.
      </p>
    ),
  },
  {
    id: "disclaimer",
    title: "9. Disclaimers",
    body: (
      <>
        <p>
          The Service is provided <strong>&quot;as is&quot;</strong> and{" "}
          <strong>&quot;as available&quot;</strong> without warranties of any kind,
          express or implied, including merchantability, fitness for a particular
          purpose, accuracy, or non-infringement.
        </p>
        <p>
          Generated prompts and AI outputs are for informational purposes only and
          should not be relied on as legal, medical, financial, or other professional
          advice. You are responsible for reviewing outputs before acting on them.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "10. Limitation of liability",
    body: (
      <p>
        To the maximum extent permitted by law, Hakan Güven (Promtexpress) shall not
        be liable for indirect, incidental, special, consequential, or exemplary
        damages, including loss of profits, data, or goodwill. Aggregate liability
        arising from or related to the Service shall not exceed the amounts paid by
        you in the twelve months preceding the event giving rise to the claim, or
        USD 100, whichever is greater.
      </p>
    ),
  },
  {
    id: "law",
    title: "11. Governing law and dispute resolution",
    body: (
      <p>
        These Terms are governed by the laws of the Republic of Türkiye, without
        regard to conflict-of-laws rules. Disputes shall be resolved by the courts
        of Istanbul, Türkiye, except where mandatory consumer protection laws of
        your residence grant jurisdiction to local courts.
      </p>
    ),
  },
  {
    id: "changes",
    title: "12. Changes to the Service",
    body: (
      <p>
        We may add, change, or remove features at any time. If we ever introduce
        paid features, we will announce it in advance and nothing you already use
        for free will be charged without your explicit agreement.
      </p>
    ),
  },
  {
    id: "contact-terms",
    title: "13. Contact",
    body: (
      <>
        <p>Questions about these Terms?</p>
        <p className="mt-3">
          <strong>Hakan Güven (Promtexpress)</strong>
          <br />
          Korkutreis Mh. Lale Cd. No:17/20, Çankaya / Ankara, Türkiye
          <br />
          Phone:{" "}
          <a href="tel:+905376065228" className="text-primary hover:underline">
            +90 537 606 52 28
          </a>
          <br />
          Email:{" "}
          <a href="mailto:hello@promtexpress.com" className="text-primary hover:underline">
            hello@promtexpress.com
          </a>
          <br />
          Or use our{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact form
          </Link>
          .
        </p>
      </>
    ),
  },
];

export const PRIVACY_SECTIONS: Section[] = [
  {
    id: "controller",
    title: "1. Data controller",
    body: (
      <>
        <p>
          The data controller is <strong>Hakan Güven</strong> (sole trader, Turkey),
          trading as <strong>Promtexpress</strong>, operating the Service at
          promtexpress.com.
        </p>
        <p className="mt-3">
          <strong>Contact details:</strong>
          <br />
          Korkutreis Mh. Lale Cd. No:17/20, Çankaya / Ankara, Türkiye
          <br />
          Phone:{" "}
          <a href="tel:+905376065228" className="text-primary hover:underline">
            +90 537 606 52 28
          </a>
          <br />
          Email:{" "}
          <a href="mailto:hello@promtexpress.com" className="text-primary hover:underline">
            hello@promtexpress.com
          </a>
        </p>
      </>
    ),
  },
  {
    id: "data-collected",
    title: "2. Personal data we process",
    body: (
      <>
        <p>We process the following categories of personal data:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>
            <strong>Account data:</strong> name, email address, password hash, country
            (when supplied at signup), authentication provider identifiers (e.g. Google
            ID).
          </li>
          <li>
            <strong>Usage data:</strong> prompts you submit, generated prompt outputs,
            generation timestamps, audit logs.
          </li>
          <li>
            <strong>AI provider keys:</strong> the API keys you add in Settings,
            stored encrypted (AES-256-GCM) together with the provider name, the model
            you chose, and the last four characters for display.
          </li>
          <li>
            <strong>Feedback:</strong> messages you send from the Feedback page.
          </li>
          <li>
            <strong>Billing data (purchases before October 2026 only):</strong>{" "}
            Paddle customer ID and transaction IDs. We never stored card numbers;
            payment data is held by Paddle. The Service no longer takes payments.
          </li>
          <li>
            <strong>Technical data:</strong> IP address, browser/user-agent, device
            type, language preference, referrer; logged for security and
            troubleshooting.
          </li>
          <li>
            <strong>Communications:</strong> support tickets, magic-link emails sent
            via our email provider.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "purposes",
    title: "3. Purposes and legal bases",
    body: (
      <>
        <p>We process personal data for the following purposes:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>
            <strong>Performance of the contract</strong> — to provide the Service,
            authenticate users, store your AI provider keys, and deliver generated
            prompts.
          </li>
          <li>
            <strong>Legitimate interest</strong> — to detect abuse, prevent fraud,
            secure infrastructure, and improve product quality.
          </li>
          <li>
            <strong>Legal obligation</strong> — to keep transactional records and
            respond to lawful requests.
          </li>
          <li>
            <strong>Consent</strong> — for optional marketing emails, where
            applicable, with the right to withdraw at any time.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "subprocessors",
    title: "4. Subprocessors and recipients",
    body: (
      <>
        <p>
          We share personal data only with the processors needed to operate the
          Service:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>
            <strong>Paddle.com Market Limited</strong> — Merchant of Record for
            purchases made before October 2026 only (UK). No data is sent to Paddle
            for current use of the Service.
          </li>
          <li>
            <strong>Brevo</strong> — transactional email delivery (France/EU).
          </li>
          <li>
            <strong>Google LLC</strong> — OAuth sign-in (when chosen by the user)
            (USA/EU).
          </li>
          <li>
            <strong>Cloudflare, Inc.</strong> — CDN, DDoS protection, analytics
            (global).
          </li>
          <li>
            <strong>The AI provider you choose</strong> — OpenAI, Anthropic, Google,
            DeepSeek, or OpenRouter, whichever API key is active on your account —
            receives the prompts you submit, under your own account with that
            provider.
          </li>
          <li>
            <strong>Hosting</strong> — server is operated in a managed colocation
            facility in Europe.
          </li>
        </ul>
        <p className="mt-3">
          We do not sell personal data and we do not share it for advertising
          profiling.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "5. Retention",
    body: (
      <p>
        We keep personal data for as long as your account is active. After account
        deletion, we erase or anonymise personal data within 90 days unless we are
        required to retain certain records for tax or legal reasons (typically up to
        10 years for billing records). Audit logs are retained up to 12 months for
        security purposes.
      </p>
    ),
  },
  {
    id: "rights",
    title: "6. Your rights",
    body: (
      <>
        <p>
          Subject to applicable law (KVKK, GDPR, and similar regimes), you have the
          right to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>access the personal data we hold about you;</li>
          <li>request correction of inaccurate data;</li>
          <li>
            request deletion (the &quot;right to erasure&quot;) where legal grounds
            apply;
          </li>
          <li>request restriction or object to processing;</li>
          <li>request portability of data you provided;</li>
          <li>withdraw consent at any time, where processing is based on consent;</li>
          <li>
            lodge a complaint with the Turkish Personal Data Protection Authority
            (KVKK) or the competent supervisory authority in your jurisdiction.
          </li>
        </ul>
        <p className="mt-3">
          To exercise any of these rights, email{" "}
          <a href="mailto:hello@promtexpress.com" className="text-primary hover:underline">
            hello@promtexpress.com
          </a>
          . We respond within 30 days.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "7. International transfers",
    body: (
      <p>
        Some of our processors are located outside Türkiye and the EEA. We rely on
        appropriate safeguards — such as Standard Contractual Clauses or processor
        adequacy decisions — to protect international transfers. The list of
        recipients above identifies the relevant jurisdictions.
      </p>
    ),
  },
  {
    id: "security",
    title: "8. Security",
    body: (
      <p>
        We implement technical and organisational measures appropriate to the risk,
        including encrypted transport (TLS), encrypted storage of secrets at rest
        (AES-256-GCM), least-privilege access controls, and audit logging. No system
        is perfectly secure; if we become aware of a personal data breach affecting
        you, we will notify you and, where required, the supervisory authority within
        72 hours.
      </p>
    ),
  },
  {
    id: "children",
    title: "9. Children",
    body: (
      <p>
        The Service is not directed to children under 18. We do not knowingly process
        personal data of minors. If you believe a minor has created an account, contact
        us and we will erase the account.
      </p>
    ),
  },
  {
    id: "changes-priv",
    title: "10. Changes to this policy",
    body: (
      <p>
        We may update this Privacy Policy. The &quot;Last updated&quot; date at the
        top of the page reflects the most recent change. Material changes will be
        notified by email or in-product banner.
      </p>
    ),
  },
];

export const COOKIE_SECTIONS: Section[] = [
  {
    id: "what-cookies",
    title: "1. What are cookies?",
    body: (
      <p>
        Cookies are small text files that a website places on your device to remember
        information between visits. We also use similar technologies, such as local
        storage, in the same way. This page applies to both.
      </p>
    ),
  },
  {
    id: "categories",
    title: "2. Categories we use",
    body: (
      <>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            <strong>Strictly necessary</strong> — authentication session cookie,
            CSRF token, language and theme preference. Without these the Service
            cannot function. Set under our own domain. No prior consent required.
          </li>
          <li>
            <strong>Analytics</strong> — Cloudflare Web Analytics for aggregated,
            cookie-light traffic measurement (no fingerprinting). May be disabled
            from your account.
          </li>
        </ul>
        <p className="mt-3">
          We do not use advertising cookies, tracking pixels, or third-party social
          plugins.
        </p>
      </>
    ),
  },
  {
    id: "manage",
    title: "3. How to manage cookies",
    body: (
      <p>
        You can configure your browser to block or warn you about cookies. Blocking
        strictly necessary cookies will sign you out. Browser
        documentation: Chrome, Firefox, Safari, and Edge each provide settings under
        Privacy &amp; Security.
      </p>
    ),
  },
  {
    id: "contact-cookie",
    title: "4. Contact",
    body: (
      <p>
        Questions about cookies? Email{" "}
        <a href="mailto:hello@promtexpress.com" className="text-primary hover:underline">
          hello@promtexpress.com
        </a>
        .
      </p>
    ),
  },
];

/**
 * KVKK (Turkish Personal Data Protection Law) — bilingual layout.
 * English summary on top + original Turkish legal text below for each section.
 * The Turkish original is the legally binding version (Turkish jurisdiction).
 */
function KvkkOriginal({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 pt-4 border-t border-border/60 text-[13px] leading-[1.7] text-text-faint">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
        Türkçe orijinal (yasal bağlayıcı metin)
      </p>
      {children}
    </div>
  );
}

export const KVKK_SECTIONS: Section[] = [
  {
    id: "data-controller",
    title: "1. Data Controller",
    body: (
      <>
        <p>
          Under Turkish Personal Data Protection Law No. 6698 (&quot;KVKK&quot;), the
          data controller is <strong>Hakan Güven</strong> (sole trader, Turkey),
          operating under the trade name <strong>Promtexpress</strong>.
        </p>
        <p className="mt-3">
          <strong>Contact:</strong>
          <br />
          Korkutreis Mh. Lale Cd. No:17/20, Çankaya / Ankara, Turkey
          <br />
          Phone:{" "}
          <a href="tel:+905376065228" className="text-primary hover:underline">
            +90 537 606 52 28
          </a>
          <br />
          Email:{" "}
          <a href="mailto:hello@promtexpress.com" className="text-primary hover:underline">
            hello@promtexpress.com
          </a>
        </p>
        <KvkkOriginal>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca
            veri sorumlusu, <strong>Hakan Güven</strong> (şahıs firması, Türkiye) /
            ticari isim <strong>Promtexpress</strong>&apos;tir.
          </p>
          <p className="mt-3">
            <strong>İletişim:</strong>
            <br />
            Korkutreis Mh. Lale Cd. No:17/20, Çankaya / Ankara, Türkiye
            <br />
            Telefon: +90 537 606 52 28
            <br />
            E-posta: hello@promtexpress.com
          </p>
        </KvkkOriginal>
      </>
    ),
  },
  {
    id: "processing-purposes",
    title: "2. Purposes of personal data processing",
    body: (
      <>
        <p>Your personal data is processed for the following purposes:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>account creation, identity verification, and account management;</li>
          <li>service delivery, including storing the AI provider keys you add;</li>
          <li>responding to support requests and communication;</li>
          <li>security, abuse prevention, and compliance with legal obligations.</li>
        </ul>
        <KvkkOriginal>
          <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>üyelik oluşturma, kimlik doğrulama ve hesap yönetimi;</li>
            <li>eklediğiniz yapay zekâ sağlayıcı anahtarlarının saklanması dahil hizmetin sunulması;</li>
            <li>destek talebi yanıtlama ve iletişim;</li>
            <li>güvenlik, kötüye kullanımı önleme ve hukuki yükümlülüklere uyum.</li>
          </ul>
        </KvkkOriginal>
      </>
    ),
  },
  {
    id: "processing-grounds",
    title: "3. Lawful grounds for processing (KVKK Art. 5)",
    body: (
      <>
        <p>
          Processing is based on: formation and performance of the contract, fulfillment
          of legal obligations, the data controller&apos;s legitimate interest, and —
          where required — your explicit consent.
        </p>
        <KvkkOriginal>
          <p>
            İşleme faaliyeti; sözleşmenin kurulması ve ifası, hukuki yükümlülüklerin
            yerine getirilmesi, veri sorumlusunun meşru menfaati ve — gerekli hâllerde —
            açık rızanız hukuki sebeplerine dayanmaktadır.
          </p>
        </KvkkOriginal>
      </>
    ),
  },
  {
    id: "data-transfer",
    title: "4. Transfer of data",
    body: (
      <>
        <p>
          To run the service, your personal data is transferred to the following overseas
          processors (KVKK Art. 9): Brevo (email — EU), Google (OAuth — US/EU), Cloudflare
          (CDN/Analytics — global), and the AI provider whose API key you add (OpenAI,
          Anthropic, Google, DeepSeek, or OpenRouter). Paddle (UK) holds data only for
          purchases made before October 2026. Transfers comply with KVKK&apos;s safe-country /
          standard contractual clauses / explicit consent provisions.
        </p>
        <KvkkOriginal>
          <p>
            Hizmetin yürütülmesi için kişisel verileriniz aşağıdaki yurt dışı işleyenlere
            aktarılır (KVKK m.9): Brevo (e-posta — AB), Google (OAuth — ABD/AB), Cloudflare
            (CDN/Analytics — küresel) ve API anahtarını eklediğiniz yapay zekâ
            sağlayıcısı (OpenAI, Anthropic, Google, DeepSeek veya OpenRouter). Paddle
            (Birleşik Krallık) yalnızca Ekim 2026 öncesinde yapılan satın alımlara ait
            verileri tutar. Aktarımlar
            KVKK&apos;nın güvenli ülke / standart sözleşme / açık rıza hükümlerine
            uygun olarak gerçekleştirilir.
          </p>
        </KvkkOriginal>
      </>
    ),
  },
  {
    id: "data-subject-rights",
    title: "5. Data subject rights (KVKK Art. 11)",
    body: (
      <>
        <p>As a data subject under Article 11 of the Law you have the right to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>learn whether your personal data is being processed;</li>
          <li>request information about it if it has been processed;</li>
          <li>learn the purpose of processing and whether it is used appropriately;</li>
          <li>learn the third parties to whom data is transferred domestically or abroad;</li>
          <li>request correction if it has been processed incompletely or incorrectly;</li>
          <li>request its erasure or destruction;</li>
          <li>request that corrections/erasures/destructions be notified to third parties to whom data was transferred;</li>
          <li>object to outcomes against you arising from automated analysis;</li>
          <li>claim compensation for damages caused by unlawful processing.</li>
        </ul>
        <p className="mt-3">
          Send requests to{" "}
          <a href="mailto:hello@promtexpress.com" className="text-primary hover:underline">
            hello@promtexpress.com
          </a>{" "}
          or in writing pursuant to the Communiqué on Procedures and Principles for
          Application to the Data Controller. Requests are answered free of charge within 30 days.
        </p>
        <KvkkOriginal>
          <p>İlgili kişi olarak Kanun&apos;un 11. maddesi gereği şu haklara sahipsiniz:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>kişisel verilerinizin işlenip işlenmediğini öğrenme;</li>
            <li>işlendiyse buna ilişkin bilgi talep etme;</li>
            <li>işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme;</li>
            <li>yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri öğrenme;</li>
            <li>eksik/yanlış işlenmişse düzeltilmesini isteme;</li>
            <li>silinmesini veya yok edilmesini isteme;</li>
            <li>düzeltme/silme/yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini talep etme;</li>
            <li>otomatik analiz sonucu aleyhe çıkan sonuçlara itiraz etme;</li>
            <li>kanuna aykırı işleme nedeniyle uğranılan zararın giderilmesini talep etme.</li>
          </ul>
          <p className="mt-3">
            Başvurularınızı hello@promtexpress.com adresine iletebilir veya Veri
            Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ&apos;e göre yazılı yolla
            iletebilirsiniz. Başvurular 30 gün içinde ücretsiz olarak yanıtlanır.
          </p>
        </KvkkOriginal>
      </>
    ),
  },
  {
    id: "retention-deletion",
    title: "6. Retention and deletion",
    body: (
      <>
        <p>
          Your personal data is retained while your account is active. After account
          closure it is deleted or anonymized within 90 days. Statutory retention obligations
          (e.g. tax) are reserved — typically 10 years.
        </p>
        <KvkkOriginal>
          <p>
            Kişisel verileriniz, hesap aktif olduğu sürece muhafaza edilir. Hesabın
            kapatılmasından sonra 90 gün içinde silinir veya anonim hâle getirilir. Vergi
            ve benzeri yasal saklama yükümlülükleri saklı kalmak kaydıyla — bu süre
            genellikle 10 yıldır.
          </p>
        </KvkkOriginal>
      </>
    ),
  },
  {
    id: "data-security",
    title: "7. Data security",
    body: (
      <>
        <p>
          Your data is protected with TLS-encrypted transport, AES-256-GCM encrypted
          secret storage, least-privilege access, and audit logs. We apply administrative
          and technical measures required by KVKK.
        </p>
        <KvkkOriginal>
          <p>
            Verileriniz TLS şifreli iletim, AES-256-GCM ile şifreli sır saklama, en az
            ayrıcalık erişimi ve denetim kayıtları ile korunmaktadır. KVKK&apos;da
            öngörülen idari ve teknik tedbirleri uygulamaktayız.
          </p>
        </KvkkOriginal>
      </>
    ),
  },
];

export function LegalSectionRenderer({
  sections,
  title,
  lastUpdated,
}: {
  sections: Section[];
  title: string;
  lastUpdated: string;
}) {
  return (
    <div>
      <h1 className="text-[36px] font-semibold tracking-[-0.025em] mb-1">{title}</h1>
      <p className="text-sm text-text-faint mb-10">Last updated: {lastUpdated}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12">
        <aside className="hidden lg:block sticky top-24 self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint mb-3">
            On this page
          </p>
          <nav>
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block py-1.5 pl-3 text-sm border-l-2 transition-colors ${
                  i === 0
                    ? "border-primary text-primary"
                    : "border-border text-text-muted hover:text-text"
                }`}
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="max-w-[760px] text-[15px] leading-[1.75] text-text-muted">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="mb-9 scroll-mt-24">
              <h2 className="text-[22px] font-semibold text-text mb-2.5">{s.title}</h2>
              {s.body}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
