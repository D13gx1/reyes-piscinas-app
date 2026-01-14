#Correr app
ionic serve 
npm start

#restaurar app
1.- ver en android/app/google-service 
2.- agregar el del terminal de firebase
3.- en el emulador de android agregar cuenta de gmail (deberia de salir del error de "no credential found")
4.-java 21
5.- cualquier otro error puede ser de capacitor.config.ts o en carpeta android

#buildear
ng build
npx cap sync android
npx cap open android

#Error al usar otro java 
cd C:\Users\Admin\Desktop\All\Proyectos\reyes-piscinas-app\android
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%PATH%

java -version

Después de que funcione, edita el archivo android/gradle.properties y agrega al final:

propertiesorg.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr