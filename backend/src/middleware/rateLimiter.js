import rateLimit from 'express-rate-limit';

/**
 * Límite estricto para login: 10 intentos por IP cada 15 minutos.
 * Protege contra ataques de fuerza bruta sobre credenciales.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
});

/**
 * Límite para registro: 5 cuentas nuevas por IP cada hora.
 * Evita creación masiva de cuentas falsas.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Has superado el límite de registros. Intenta de nuevo en una hora.' },
});

/**
 * Límite para recuperación de contraseña: 5 solicitudes por IP cada hora.
 * Evita enumeración de correos registrados por fuerza bruta.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en una hora.' },
});

/**
 * Límite para creación de pedidos públicos: 8 intentos por IP cada 15 minutos.
 * Reduce abuso sobre el checkout invitado.
 */
export const checkoutOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de checkout. Intenta de nuevo en 15 minutos.' },
});

/**
 * Límite para generación de firma/config del widget: 20 solicitudes por IP cada 15 minutos.
 * Evita automatización agresiva del endpoint público de Wompi.
 */
export const checkoutWidgetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de pago. Intenta de nuevo en unos minutos.' },
});

/**
 * Límite para webhook de Wompi: 200 eventos por minuto por IP.
 * Protege contra floods al endpoint público de eventos de pago.
 */
export const wompiWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests.' },
});
