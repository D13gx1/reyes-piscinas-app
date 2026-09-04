# Guía para reconfigurar Android y Firebase

Esta guía explica cómo volver a preparar Reyes Piscinas después de formatear el computador, cambiar de equipo o regenerar la configuración Android.

## Datos fijos del proyecto

- Nombre: `Reyes Piscinas`
- Package name / application ID: `com.reyespiscinas.app`
- Proyecto Firebase: `reyes-piscinas`
- Plugin nativo usado para Google Login: `@capacitor-firebase/authentication`
- Archivo Firebase Android: `android/app/google-services.json`

El `package name` debe coincidir exactamente en Firebase y en `android/app/build.gradle`.

## 1. Instalar requisitos

Instala lo siguiente:

- Node.js y npm
- Ionic CLI y Capacitor CLI, si no vienen disponibles en el proyecto
- Android Studio
- Android SDK y Platform Tools
- Java 21, preferiblemente el JDK incluido con Android Studio

En este computador Android Studio está instalado en:

```text
/opt/android-studio
```

Y su JDK está en:

```text
/opt/android-studio/jbr
```

En otro computador las rutas pueden ser diferentes.

## 2. Descargar el proyecto e instalar dependencias

Desde la raíz del proyecto:

```fish
npm install
```

Si Capacitor no está disponible globalmente, se puede usar siempre mediante `npx`.

## 3. Configurar Android Studio y Java en Fish

Usa las rutas reales de tu instalación. Para este computador:

```fish
set -Ux CAPACITOR_ANDROID_STUDIO_PATH /opt/android-studio/bin/studio.sh
set -Ux JAVA_HOME /opt/android-studio/jbr
fish_add_path /opt/android-studio/jbr/bin
fish_add_path $HOME/Android/Sdk/platform-tools
```

Verifica:

```fish
java -version
adb version
```

Si Android Studio está instalado en otra ruta, cambia `/opt/android-studio` por la ruta correcta.

## 4. Registrar la app Android en Firebase

En Firebase Console:

1. Abre el proyecto `reyes-piscinas`.
2. Ve a **Configuración del proyecto**.
3. En **Tus apps**, selecciona la aplicación Android `Reyes Piscinas Android`.
4. Confirma que el nombre del paquete sea:

```text
com.reyespiscinas.app
```

No crees otra app si ya existe una con ese package name.

## 5. Agregar las huellas digitales

Las huellas dependen del computador y del keystore con el que se firma el APK. Por eso, después de cambiar de equipo debes obtener la huella de ese equipo y registrarla en Firebase.

Desde la raíz del proyecto ejecuta:

# Firebase Android: recordatorio

Para este proyecto:

```text
Package name: com.reyespiscinas.app
```

## Después de formatear o cambiar de computador

1. En Firebase Console abre `reyes-piscinas`.
2. Selecciona la app Android `Reyes Piscinas Android`.
3. Obtén la huella del computador actual:

```fish
./android/gradlew -p android signingReport
```

4. En Firebase agrega el `SHA1` de `Variant: debug`. También agrega el `SHA-256`.
5. Descarga nuevamente `google-services.json`.
6. Guarda el archivo exactamente aquí:

```text
android/app/google-services.json
```

No crees otra app ni elimines las huellas anteriores.

Después ejecuta:

```fish
npx cap sync android
./android/gradlew -p android assembleDebug
```

## Si aparece un error

- `No credential available` o `DEVELOPER_ERROR`: falta el SHA-1 correcto o debes descargar nuevamente el JSON.
- `FirebaseAuthentication plugin is not implemented on android`: falta sincronizar o reinstalar la app.

En ambos casos:

```fish
npx cap sync android
./android/gradlew -p android assembleDebug
```

Luego instala el APK nuevo desde Android Studio.
Cada vez que cambies plugins, `capacitor.config.ts` o `google-services.json`, ejecuta:
