#Correr app
ionic serve 
npm start

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