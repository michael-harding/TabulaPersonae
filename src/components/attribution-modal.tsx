import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal"

const CC_BY_4_LEGAL_CODE = "https://creativecommons.org/licenses/by/4.0/legalcode"

/**
 * A URL linked in running text. The URLs below are longer than a phone-width line, so unlike
 * INLINE_LINK_TARGET (which keeps a link on one line) this one may break anywhere. It is one
 * inline-block box, which pushes the text beside it aside rather than covering it, and py-3 makes
 * it at least 44px tall. The punctuation after the URL goes inside the box (`trailing`), so it
 * follows the URL's last character instead of dropping onto a line of its own; only the URL is
 * underlined.
 */
function ExternalLink(props: { href: string; trailing?: string }) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      class="group inline-block min-h-11 py-3 text-primary [overflow-wrap:anywhere]"
    >
      <span class="underline group-hover:no-underline">{props.href}</span>{props.trailing}
    </a>
  )
}

/**
 * The footer's Attribution link and the dialog it opens: the sources whose material the app uses.
 *
 * The app follows both editions of the rules, so it credits both System Reference Documents. Each
 * statement is the one its document's legal page asks for, word for word (CC BY 4.0 requires it);
 * Wizards of the Coast asks for no other attribution to it beside these.
 */
export function AttributionModal() {
  return (
    <Modal>
      <ModalTrigger data-test="attribution-link" class="underline-offset-4 hover:underline">
        Attribution
      </ModalTrigger>
      <ModalContent data-test="attribution-dialog">
        <ModalHeader>
          <ModalTitle>Attribution</ModalTitle>
          <ModalDescription>
            TabulaPersonae uses game rules material from these sources.
          </ModalDescription>
        </ModalHeader>

        <section class="space-y-1 text-sm">
          <h3 class="font-semibold">System Reference Document 5.2.1 <span class="font-normal text-muted-foreground">(2024 rules)</span></h3>
          <p data-test="attribution-srd-5-2-1">
            This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by
            Wizards of the Coast LLC, available at{" "}
            <ExternalLink href="https://www.dndbeyond.com/srd" trailing="." /> The SRD 5.2.1 is
            licensed under the Creative Commons Attribution 4.0 International License, available
            at <ExternalLink href={CC_BY_4_LEGAL_CODE} trailing="." />
          </p>
        </section>

        <section class="space-y-1 text-sm">
          <h3 class="font-semibold">System Reference Document 5.1 <span class="font-normal text-muted-foreground">(2014 rules)</span></h3>
          <p data-test="attribution-srd-5-1">
            This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by
            Wizards of the Coast LLC and available at{" "}
            <ExternalLink href="https://dnd.wizards.com/resources/systems-reference-document" trailing="." />{" "}
            The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License
            available at <ExternalLink href={CC_BY_4_LEGAL_CODE} trailing="." />
          </p>
        </section>

        <p class="text-sm text-muted-foreground">
          TabulaPersonae is an independent project, not affiliated with or endorsed by Wizards of the
          Coast.
        </p>
      </ModalContent>
    </Modal>
  )
}
