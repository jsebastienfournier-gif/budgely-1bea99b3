/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Budgely'

interface ContactConfirmationProps {
  name?: string
}

const ContactConfirmationEmail = ({ name }: ContactConfirmationProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Merci pour votre message — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Merci ${name} !` : 'Merci pour votre message !'}
        </Heading>
        <Text style={text}>
          Nous avons bien reçu votre message et nous vous répondrons dans les meilleurs délais.
        </Text>
        <Text style={text}>
          En attendant, n'hésitez pas à explorer votre espace {SITE_NAME} pour mieux gérer vos finances.
        </Text>
        <Text style={footer}>À bientôt, L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'Merci pour votre message',
  displayName: 'Confirmation de contact',
  previewData: { name: 'Marie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }
const container = { padding: '32px 28px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(224, 71%, 4%)',
  margin: '0 0 24px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 16%, 47%)',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 47%)', margin: '32px 0 0' }
