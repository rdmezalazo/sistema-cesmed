# Sistema CESMED

Sistema integral de gestión clínica y administrativa desarrollado con tecnologías modernas para la administración de centros médicos, consultorios y servicios de salud.

---

## 🌐 Demo en Producción

El sistema se encuentra desplegado en Vercel:

[https://sistema-cesmed-liyvo78uh-ronald-meza-s-projects.vercel.app/](https://sistema-cesmed-liyvo78uh-ronald-meza-s-projects.vercel.app/)

---

## 🚀 Características Principales

### 🩺 Gestión Clínica

* Administración de historias clínicas
* Registro de atenciones médicas
* Gestión de pacientes
* Agenda y programación de citas
* Prescripciones médicas
* Seguimiento de pacientes

### 💊 Módulo de Farmacia

* Control de inventario
* Kardex de medicamentos
* Entradas y salidas
* Gestión de proveedores
* Fórmulas magistrales
* Alertas de stock

### 👓 Módulo de Óptica

* Gestión de productos ópticos
* Control de stock
* Registro de ventas
* Comprobantes y reportes

### 💳 Facturación y Pagos

* Emisión de comprobantes
* Gestión de pagos
* Control de ingresos y egresos
* Reportes financieros
* Correlativos y plantillas

### 👨‍⚕️ Gestión Administrativa

* Gestión de usuarios
* Roles y permisos
* Especialidades médicas
* Configuración de horarios
* Panel administrativo

---

## 🛠️ Tecnologías Utilizadas

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* Ant Design

### Backend & Servicios

* Supabase
* PostgreSQL
* API REST

### Librerías Principales

* React Query
* React Router
* React Hook Form
* date-fns
* Lucide React

---

## 📂 Estructura del Proyecto

```bash
src/
├── components/
│   ├── appointments/
│   ├── auth/
│   ├── clinic/
│   ├── comprobantes/
│   ├── medical-records/
│   ├── pharmacy/
│   ├── optics/
│   ├── patients/
│   ├── payments/
│   ├── prescriptions/
│   └── ui/
├── hooks/
├── integrations/
├── lib/
├── pages/
└── scripts/
```

---

## ⚙️ Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/rdmezalazo/sistema-cesmed.git
```

### 2. Ingresar al proyecto

```bash
cd sistema-cesmed
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar variables de entorno

Crear un archivo `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

---

## 🏗️ Build de Producción

```bash
npm run build
```

Vista previa local:

```bash
npm run preview
```

---

## ☁️ Despliegue

El proyecto se encuentra preparado para despliegue en:

* Vercel
* Netlify
* Render

### Variables necesarias en producción

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 🔐 Seguridad

* Gestión de autenticación
* Roles y permisos
* Protección de rutas
* Variables de entorno seguras
* Integración con Supabase Auth

---

## 📊 Funcionalidades del Sistema

| Módulo               | Estado |
| -------------------- | ------ |
| Gestión de Pacientes | ✅      |
| Historias Clínicas   | ✅      |
| Agenda Médica        | ✅      |
| Farmacia             | ✅      |
| Óptica               | ✅      |
| Comprobantes         | ✅      |
| Pagos                | ✅      |
| Reportes             | ✅      |
| Usuarios y Roles     | ✅      |

---

## 📌 Scripts Disponibles

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

## 🤝 Contribución

1. Crear una rama nueva
2. Realizar cambios
3. Crear commit
4. Enviar Pull Request

---

## 📄 Licencia

Este proyecto es de uso privado y confidencial.

---

## 👨‍💻 Autor

**Ronald Meza Lazo**

* GitHub: [https://github.com/rdmezalazo](https://github.com/rdmezalazo)
* LinkedIn: [https://www.linkedin.com](https://www.linkedin.com/in/ronald-meza-lazo-2791a155/)](https://www.linkedin.com)

---

## ⭐ Estado del Proyecto

Proyecto en desarrollo activo con mejoras continuas, optimización de módulos y ampliación de funcionalidades para gestión médica integral.
