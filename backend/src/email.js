const RESEND_API_URL = 'https://api.resend.com/emails';

function getEmailSettings() {
  return {
    apiKey: String(process.env.RESEND_API_KEY || '').trim(),
    from: String(process.env.RESEND_FROM_EMAIL || '').trim(),
    storefrontName: String(process.env.STOREFRONT_NAME || 'Azami').trim() || 'Azami',
    appUrl: String(process.env.FRONTEND_APP_URL || 'http://localhost:5173').trim().replace(/\/$/, ''),
  };
}

function formatPrice(value, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function renderItems(items = []) {
  return items
    .map((item) => `- ${item.quantity} x ${item.nombre} (${formatPrice(item.unitPrice || item.precio)})`)
    .join('\n');
}

async function sendEmail({ to, subject, html, text }) {
  const settings = getEmailSettings();

  if (!settings.apiKey || !settings.from) {
    console.log(`\n[email fallback] ${subject}\nTo: ${to}\n${text}\n`);
    return { skipped: true, reason: 'missing-config' };
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: settings.from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend respondió ${response.status}: ${body}`);
  }

  return response.json();
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const { storefrontName } = getEmailSettings();
  const subject = `${storefrontName}: restablece tu contraseña`;
  const text = [
    `Recibimos una solicitud para restablecer tu contraseña en ${storefrontName}.`,
    `Abre este enlace para continuar: ${resetUrl}`,
    'Si no solicitaste este cambio, puedes ignorar este correo.',
  ].join('\n\n');
  const html = `
    <div style="font-family: Georgia, serif; color: #1f1c1a; line-height: 1.6;">
      <h1 style="margin-bottom: 0.5rem;">Restablece tu contraseña</h1>
      <p>Recibimos una solicitud para restablecer tu contraseña en <strong>${storefrontName}</strong>.</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; background: #1f1c1a; color: #fff8f2; text-decoration: none; border-radius: 999px;">Crear nueva contraseña</a></p>
      <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      <p style="font-size: 0.9rem; color: #6f665f;">Enlace directo: ${resetUrl}</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

export async function sendPasswordResetPinEmail({ to, pin, expiresMinutes = 15 }) {
  const { storefrontName, appUrl } = getEmailSettings();
  const subject = `${storefrontName}: tu PIN para restablecer contraseña`;
  const text = [
    `Recibimos una solicitud para restablecer tu contraseña en ${storefrontName}.`,
    `Tu PIN de verificación es: ${pin}`,
    `Este PIN vence en ${expiresMinutes} minutos.`,
    `Ingresa el PIN en ${appUrl}/reset-password para crear tu nueva contraseña.`,
    'Si no solicitaste este cambio, ignora este correo.',
  ].join('\n\n');

  const html = `
    <div style="font-family: Georgia, serif; color: #1f1c1a; line-height: 1.6;">
      <h1 style="margin-bottom: 0.5rem;">Restablece tu contraseña</h1>
      <p>Recibimos una solicitud para restablecer tu contraseña en <strong>${storefrontName}</strong>.</p>
      <p>Tu PIN de verificación es:</p>
      <p style="font-size: 2rem; letter-spacing: 0.35rem; font-weight: 700; margin: 0.8rem 0 1rem;">${pin}</p>
      <p>Este PIN vence en <strong>${expiresMinutes} minutos</strong>.</p>
      <p>Ingresa el código en <a href="${appUrl}/reset-password">${appUrl}/reset-password</a>.</p>
      <p style="font-size: 0.9rem; color: #6f665f;">Si no solicitaste este cambio, ignora este correo.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

export async function sendOrderConfirmationEmail({ to, customerName, order }) {
  if (!to) {
    return { skipped: true, reason: 'missing-recipient' };
  }

  const { storefrontName, appUrl } = getEmailSettings();
  const subject = `${storefrontName}: recibimos tu pedido ${order.referencia_pago}`;
  const itemsText = renderItems(order.items);
  const text = [
    `Hola ${customerName || 'cliente'},`,
    `Recibimos tu pedido ${order.referencia_pago} en ${storefrontName}.`,
    `Total: ${formatPrice(order.total, order.moneda)}.`,
    `Estado actual: ${order.estado}.`,
    '',
    'Resumen del pedido:',
    itemsText,
    '',
    `Dirección: ${order.direccion_envio?.calle || ''}, ${order.direccion_envio?.ciudad || ''}, ${order.direccion_envio?.estado || ''}.`,
    `Si necesitas ayuda, responde a este correo o visita ${appUrl}.`,
  ].join('\n');
  const htmlItems = (order.items || [])
    .map((item) => `<li>${item.quantity} x ${item.nombre} <strong>${formatPrice(item.unitPrice || item.precio, order.moneda)}</strong></li>`)
    .join('');
  const html = `
    <div style="font-family: Georgia, serif; color: #1f1c1a; line-height: 1.6;">
      <h1 style="margin-bottom: 0.5rem;">Pedido recibido</h1>
      <p>Hola <strong>${customerName || 'cliente'}</strong>, ya registramos tu pedido <strong>${order.referencia_pago}</strong>.</p>
      <p>Total: <strong>${formatPrice(order.total, order.moneda)}</strong></p>
      <p>Estado actual: <strong>${order.estado}</strong></p>
      <h2 style="margin-top: 1.4rem;">Resumen</h2>
      <ul>${htmlItems}</ul>
      <p><strong>Dirección:</strong> ${order.direccion_envio?.calle || ''}, ${order.direccion_envio?.ciudad || ''}, ${order.direccion_envio?.estado || ''}</p>
      <p style="font-size: 0.9rem; color: #6f665f;">Puedes continuar el seguimiento desde ${appUrl}.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}