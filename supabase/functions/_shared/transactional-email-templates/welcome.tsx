/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Budgely'
const SITE_URL = 'https://budgely.lovable.app'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue sur {SITE_NAME} — gérez vos finances simplement</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Bienvenue ${name} 🎉` : `Bienvenue sur ${SITE_NAME} 🎉`}
        </Heading>
        <Text style={text}>
          Votre compte est prêt ! Avec {SITE_NAME}, scannez vos tickets de caisse,
          suivez vos dépenses et reprenez le contrôle de votre budget — le tout
          propulsé par l'intelligence artificielle.
        </Text>
        <Text style={text}>
          Commencez dès maintenant en ajoutant votre premier document.
        </Text>
        <Button style={button} href={`${SITE_URL}/dashboard`}>
          Accéder à mon tableau de bord
        </Button>
        <Text style={footer}>À bientôt, L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Bienvenue sur Budgely !',
  displayName: 'Bienvenue après inscription',
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
const button = {
  backgroundColor: 'hsl(221, 83%, 53%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 47%)', margin: '32px 0 0' }
