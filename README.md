REMINDER!!
Dont change my arduino code, if you MUST, please make a backup for my version(I highlyyy recommend dont)
Any problem while running the sensor, please ask me first before asking chatgpt because sometime chatgpt are stupid

Read all first before you start to do

STEPS TO RUN GYM SENSOR (\* means there are more detail below)

1.  Install ESP32 driver (https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) (\*)

2.  Install Arduino IDE
    2.1 Open Arduino IDE , Open library Manager
    Install these all: - Adafruit BusIO - Adafruit GFX library - Adafruit MPU6050 - Adafruit SSD1306 - Adafruit Unified Sensor

3.  Plug Esp32 into laptop
    Make sure
    Tools → Board → ESP32 Dev Module
    Tools → Port → select COM port (e.g. COM7) (\*\*)
4.  Open my arduino code (can be found in arduinocode.txt) and change:
    - const char\* ssid ,change my wifi name (applejuice) to your own wifi name (I highly recommend use ur laptop hotspot)
    - const char\* password , change my wifi password (12345678) to your own wifi passowrd

             You also need to change my laptop ip address to your own laptop ip address (\*\*\*)
             There are two places to change , I have commented it in the arduino, please find and change

             Before:
             http.begin("http://172.20.10.3:3000/workout");

             172.20.10.3 is my laptop address so you need to change urs
             It will be something like this
             http.begin("http://XXX.XX.XX.X:3000/workout"); \* Refer to below how to find IP address

5.  Download code from github and open in Visual Studio Code

6. Go to command prompt, cd your project
   For example(mine):
   cd C:\xampp\htdocs\BAIT2123-Internet-of-Things-GymSense-Gym-System
   then run
   npm init -y
   npm install express

Your setout is DONE

!!!How to start everytime!!!

- If first time you upload Arduino correct already, you dont need to upload everytime you want to test unless you change your code
  After first time you just need to connect the usb to ur computer then it should be okay, it will auto connect der

- Everytime you start in VS code:
  run : node server.js
  (no need to click the link)
  then run live at the bottom right corner of your VS code (You will see run live)
  - Then it will automatically run and you can test now ! :D

(\*) how to download driver: 1. Go to the website 2. Click Downloads tab 3. Press the CP210x Universal Windows Driver 4. Go to the file 5. Unzip it 6. Right click silabser (richt click the setup information type) 7. You will see Install 8. Click Install

(\*\*) how to select com port 1. Go to device manager 2. Find Port, expand it 3. Plug in the usb with my machine 4. You will see a new com port pop out 5. That is ur com port for Arduinio

(\*\*\*) how to find Ip address for your laptop 1. press 'Win + R' 2. type cmd and press enter 3. write ipconfig then enter 4. Find ur ip address at 'IPv4 Address'

Reminder again, if anything doesnt work well for the machine itself, please dont change my code, my wiring, because it takes me a lot of time to debug. Ask me first before asking LLM machine first and change
If website you may edit as much as you can as long as it dont affect my machine (please do a branches yah)

Extra thing
http://localhost:3000/workout

this is to let website and sensor communicate, you can open this but it memang not nothing but just to makesure connected
You can choose to open or not
Not very important

Elisha's information
Wifi name : applejuice
Wifi password 12345678
Ip address: 172.20.10.3
