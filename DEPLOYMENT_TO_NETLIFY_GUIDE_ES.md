# Guía para Compilar y Desplegar el Proyecto en Netlify

Este documento explica cómo compilar y desplegar el proyecto en Netlify, siguiendo las mejores prácticas y especificaciones del sistema.

---

## 1. Compilar el Proyecto

El proyecto utiliza Vite como herramienta de construcción. Para generar los archivos listos para producción, sigue estos pasos:

1. Abre una terminal en la raíz del proyecto (`e:/scoutwebsystem/project`).
2. Ejecuta el siguiente comando para compilar el proyecto:

```bash
npm run build
```

Este comando ejecuta el script definido en `package.json` que utiliza Vite para construir el proyecto. Los archivos generados se ubicarán en la carpeta `dist`.

---

## 2. Configurar Netlify para el Despliegue

Para desplegar el proyecto en Netlify, realiza lo siguiente:

### A. Conectar el Repositorio

- Accede a [Netlify](https://www.netlify.com/) y crea una cuenta o inicia sesión.
- En el panel de control, selecciona "New site from Git".
- Conecta tu repositorio de GitHub donde está alojado el proyecto.

### B. Configurar Opciones de Build

- En el campo **Build command** (Comando de compilación), escribe:

```
npm run build
```

- En el campo **Publish directory** (Directorio de publicación), escribe:

```
dist
```

### C. Variables de Entorno (Opcional)

Si tu proyecto utiliza variables de entorno, configúralas en Netlify:

- Ve a "Site settings" > "Build & deploy" > "Environment".
- Añade las variables necesarias, por ejemplo:

```
ENVIRONMENT=production
API_KEY=tu_api_key
OTRA_VARIABLE=valor
```

### D. Dominio Personalizado (Opcional)

- Configura un dominio personalizado en Netlify si lo deseas.
- Sigue las instrucciones para apuntar tu dominio a Netlify.

---

## 3. Recomendaciones Adicionales

- Asegúrate de que todas las contraseñas por defecto estén cambiadas antes de producción.
- Configura HTTPS y certificados SSL en Netlify (Netlify ofrece certificados gratuitos).
- Realiza pruebas exhaustivas en un entorno de staging antes de desplegar en producción.
- Configura backups y monitoreo según las recomendaciones del proyecto.
- Consulta el archivo `PRODUCTION_DEPLOYMENT_GUIDE.md` para más detalles sobre seguridad, base de datos y monitoreo.

---

## 4. Resumen de Comandos Útiles

```bash
# Instalar dependencias (si no están instaladas)
npm install

# Ejecutar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar build localmente
npm run preview
```

---

## 5. Flujo Básico para Despliegue en Netlify

1. Realiza cambios y pruebas localmente.
2. Ejecuta `npm run build` para compilar.
3. Sube los cambios a tu repositorio GitHub.
4. Netlify detectará el push y ejecutará el build automáticamente.
5. El sitio estará disponible en la URL asignada por Netlify o en tu dominio personalizado.

---

Con esta guía podrás compilar y desplegar tu proyecto en Netlify de forma segura y eficiente.

Si necesitas ayuda adicional con algún paso, no dudes en consultarme.
