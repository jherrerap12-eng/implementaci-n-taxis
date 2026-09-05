import { readFile, writeFile } from 'node:fs/promises';

const apiUrl = process.env.API_URL?.trim().replace(/\/+$/, '');

if (!apiUrl) {
  console.log(
    'API_URL no definida; se conservará la URL configurada en environment.ts.',
  );
  process.exit(0);
}

let url;
try {
  url = new URL(apiUrl);
} catch {
  throw new Error('API_URL debe ser una URL absoluta válida');
}

if (!['http:', 'https:'].includes(url.protocol)) {
  throw new Error('API_URL debe utilizar el protocolo HTTP o HTTPS');
}

const rutaEnvironment = new URL(
  '../src/environments/environment.ts',
  import.meta.url,
);
const contenidoActual = await readFile(rutaEnvironment, 'utf8');
const contenidoNuevo = contenidoActual.replace(
  /apiUrl:\s*'[^']*'/,
  `apiUrl: '${apiUrl}'`,
);

if (contenidoNuevo === contenidoActual && !contenidoActual.includes(`apiUrl: '${apiUrl}'`)) {
  throw new Error('No se encontró apiUrl en environment.ts');
}

await writeFile(rutaEnvironment, contenidoNuevo, 'utf8');
console.log(`API de producción configurada para ${url.hostname}`);
