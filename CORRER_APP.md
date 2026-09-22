# Ejecutar la app en el navegador
npm start

# Preparar Android desde Linux
# Ejecutar todos los comandos desde la raiz del proyecto.
npm install
java -version
npm run build
npx cap sync android
npx cap open android

# En Android Studio
# 1. Esperar a que termine Gradle Sync.
# 2. Seleccionar un emulador o un dispositivo conectado.
# 3. Pulsar Run (el boton verde).

# Generar un APK debug desde la terminal
cd android
./gradlew assembleDebug
# Salida: android/app/build/outputs/apk/debug/app-debug.apk

# Java en Linux
# Capacitor/Android requiere Java 17 o superior; se recomienda Java 21.
export JAVA_HOME=/ruta/a/tu/jdk-21
export PATH="$JAVA_HOME/bin:$PATH"
java -version

# Si se usa el JDK incluido con Android Studio, localizarlo con:
# readlink -f "$(which java)"
# y usar como JAVA_HOME la carpeta que contiene el directorio bin.

# Opcional: fijar el JDK para Gradle en este proyecto.
# En android/gradle.properties, agregar una linea como esta,
# reemplazando la ruta por la de tu instalacion:
# org.gradle.java.home=/ruta/a/tu/jdk-21

# Firebase / Google Sign-In
# Verificar que el archivo google-services.json correcto este en:
# android/app/google-services.json
# Para probar Google Sign-In, el emulador debe tener una cuenta de Google.

# Si cambia capacitor.config.ts o se actualizan plugins:
npx cap sync android