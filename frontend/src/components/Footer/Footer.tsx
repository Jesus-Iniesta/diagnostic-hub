import { Anchor, Container, Group, Text, ThemeIcon } from '@mantine/core';

import classes from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={classes.footer}>
      <Container size="lg" className={classes.inner}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={32} radius="sm" variant="filled" color="#007A4D" aria-hidden="true">
            FI
          </ThemeIcon>
          <Text size="sm">Facultad de Ingeniería • UAEMéx</Text>
        </Group>

        <Group gap="xs" wrap="wrap">
          <Text size="sm">¿Dudas o problemas para acceder?</Text>
          <Anchor href="#" className={classes.contact}>
            Contacto
          </Anchor>
        </Group>
      </Container>
    </footer>
  );
}