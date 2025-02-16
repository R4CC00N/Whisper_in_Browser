    // Componente de reconocimiento de voz
    AFRAME.registerComponent('input-text', {
        schema: {
        message: {type: 'string', default: 'comienza la grabacion!'},
        event: {type: 'string', default: ''},
        },
        init: function () {
            var el = this.el;
            var recognition;
            var isRecording = false;

            // Verificar compatibilidad con la API de reconocimiento de voz
            if ('webkitSpeechRecognition' in window) {
                recognition = new webkitSpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = false;
                recognition.lang = 'es-ES';
            } else {
                console.error('API de reconocimiento de voz no soportada en este navegador');
            }

            // Función para convertir texto a números, incluyendo negativos
            function convertirTextoANumero(texto) {
                const mapaNumeros = {
                    'cero': 0, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4,
                    'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
                };
                texto = texto.toLowerCase();
                return texto.replace(/\b(menos\s)?(\w+)\b/g, (match, menos, palabra) => {
                    const numero = mapaNumeros[palabra] !== undefined ? mapaNumeros[palabra] : isNaN(Number(palabra)) ? match : Number(palabra);
                    return menos ? -numero : numero;
                });
            }

            // Actualizar el mensaje del usuario en la escena
            function updateUserMessage(message) {
                const messageElement = document.querySelector('#userMessage');
                if (messageElement) {
                    messageElement.setAttribute('value', message);
                }
            }

            // Iniciar/Detener grabación al hacer clic
            el.addEventListener('click', () => {
                if (!isRecording) {
                    if (recognition) {
                        recognition.start();
                        isRecording = true;
                        updateUserMessage('Reconocimiento de voz iniciado...');
                    }
                } else {
                    if (recognition) {
                        recognition.stop();
                        isRecording = false;
                        updateUserMessage('Reconocimiento de voz detenido.');
                        scene.emit('exit-create-mode');
                    }
                }
            });

            // Cuando se recibe un resultado de la transcripción
            if (recognition) {
                recognition.onresult = (event) => {
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }

                    // Convertir los números en el texto
                    transcript = convertirTextoANumero(transcript);
                    // Pasar la transcripción al siguiente componente
                    el.emit('transcription', { transcription: transcript });
                };

                recognition.onerror = (event) => {
                    console.error('Error en el reconocimiento de voz:', event.error);
                    updateUserMessage('Error en reconocimiento de voz.');
                };
            }
        }
    });

    AFRAME.registerComponent('command-handler', {
        schema: {
            input: { type: 'selector', default: null },
        },
    
        init: function () {
            const el = this.el;
            const inputElement = this.data.input;
            const scene = document.querySelector('a-scene');
            const components = ['cubo', 'esfera', 'plano', 'cilindro'];
            let currentCommand = null;
    
            if (!inputElement) {
                console.error('No se ha especificado un elemento de entrada para command-handler');
                return;
            }
    
            function updateUserMessage(message) {
                const messageElement = document.querySelector('#userMessage');
                if (messageElement) {
                    messageElement.setAttribute('value', message);
                }
            }
    
            inputElement.addEventListener('transcription', (event) => {
                const transcript = event.detail.transcription.toLowerCase();
                console.log('Comando recibido Manejador:', transcript);
    
                if (transcript.includes('crear')) {
                    currentCommand = 'crear';
                    updateUserMessage('Dime qué objeto crear (cubo, esfera, plano, cilindro)');
                    scene.emit('enter-create-mode');
                } else if (currentCommand === 'crear' && components.some((comp) => transcript.includes(comp))) {
                    const objectType = components.find((comp) => transcript.includes(comp));
                    updateUserMessage(`Creando un ${objectType}.`);
                    currentCommand = null; // Resetear el comando
                    // Emitir un evento para iniciar la creación en object-creator
                    scene.emit('start-object-creation', { type: objectType });
                } else if (transcript.includes('salir')) {
                    currentCommand = 'fin';
                    updateUserMessage('Terminando creación');
                    scene.emit('end-create-mode');
                }
            });
        }
    });
    


    // Componente de visualización de transcripción
    AFRAME.registerComponent('transcription-display', {
        schema: {
            input: { type: 'selector', default: null }, // Selector del elemento que genera transcripciones
        },

        init: function () {
            const el = this.el;
            const inputElement = this.data.input;

            if (!inputElement) {
                console.error('No se ha especificado un elemento de entrada para transcription-display');
                return;
            }

            // Escuchar eventos de transcripción desde el elemento especificado
            inputElement.addEventListener('transcription', (event) => {
                const transcript = event.detail.transcription;
                const planeText = el.querySelector('#transcriptionText');

                if (planeText) {
                    planeText.setAttribute('value', transcript);
                } else {
                    console.warn('No se encontró a-text dentro de transcription-display para mostrar la transcripción');
                }
            });
        }
    });


// Componente para crear objetos
AFRAME.registerComponent('object-creator', {
    schema: {
        input: { type: 'selector', default: null },
    },

    init: function () {
        const scene = document.querySelector('a-scene');
        let currentObject = null; // Para almacenar referencia al objeto creado

        // Escuchar inicio de creación del objeto
        scene.addEventListener('start-object-creation', (event) => {
            const objectType = event.detail.type;
            console.log(`Creando objeto: ${objectType}`);
            if (objectType === 'cubo') {
                // Crear cubo con valores predeterminados
                const entity = document.createElement('a-entity');
                entity.setAttribute('geometry', 'primitive: box; height: 1; width: 1; depth: 1');
                entity.setAttribute('position', '0 5 -13');
                entity.setAttribute('material', 'color: #FFC65D');
                entity.setAttribute('class', 'dynamic-object'); // ID único para modificarlo después
                scene.appendChild(entity);
                // detecta una palabra 

                currentObject = entity;
            } else {
                console.log(`Tipo de objeto no soportado: ${objectType}`);
            }
        });

        // Escuchar comandos para modificar el cubo ya creado
        scene.addEventListener('modify-object', (event) => {
            if (!currentObject) {
                console.warn('No hay un objeto activo para modificar.');
                return;
            }

            const { attribute, value } = event.detail;
            if (attribute === 'position') {
                currentObject.setAttribute('position', value);
                console.log(`Posición del cubo actualizada a: ${value}`);
            } else if (attribute === 'geometry') {
                currentObject.setAttribute('geometry', value);
                console.log(`Geometría del cubo actualizada a: ${JSON.stringify(value)}`);
            } else if (attribute === 'material') {
                currentObject.setAttribute('material', `color: ${value}`);
                console.log(`Color del cubo actualizado a: ${value}`);
            } else {
                console.warn(`Atributo desconocido: ${attribute}`);
            }
        });
    },
});

// Componente de comandos dinámicos para modificar atributos
AFRAME.registerComponent('dynamic-modifier', {
    schema: {
        input: { type: 'selector', default: null },
    },

    init: function () {
        const inputElement = this.data.input;
        const scene = document.querySelector('a-scene');
        let modifyingObject = false;

        if (!inputElement) {
            console.error('No se ha especificado un elemento de entrada para dynamic-modifier');
            return;
        }

        const parseCommand = (transcript) => {
            const command = {};
            if (transcript.includes('posición')) {
                const posMatch = transcript.match(/x\s*(-?\d+).*y\s*(-?\d+).*z\s*(-?\d+)/i);
                if (posMatch) {
                    command.attribute = 'position';
                    command.value = `${posMatch[1]} ${posMatch[2]} ${posMatch[3]}`;
                }
            } else if (transcript.includes('tamaño')) {
                const sizeMatch = transcript.match(/alto\s*(\d+).*ancho\s*(\d+).*profundo\s*(\d+)/i);
                if (sizeMatch) {
                    command.attribute = 'geometry';
                    command.value = `height: ${sizeMatch[1]}; width: ${sizeMatch[2]}; depth: ${sizeMatch[3]}`;
                }
            } else if (transcript.includes('color')) {
                const colorMatch = transcript.match(/color\s*(\w+)/i);
                if (colorMatch) {
                    command.attribute = 'material';
                    command.value = colorMatch[1];
                }
            }
            return command;
        };

        inputElement.addEventListener('transcription', (event) => {
            const transcript = event.detail.transcription.toLowerCase();
            console.log('Comando recibido:', transcript);

            // Activar modificación de objeto
            if (transcript.includes('editar')) {
                modifyingObject = true;
                console.log('Modificación del cubo activada.');
                return;
            }

            // Procesar comandos solo si estamos en modo modificación
            if (modifyingObject) {
                const command = parseCommand(transcript);
                if (command.attribute && command.value) {
                    scene.emit('modify-object', command);
                    console.log(`Ejecutando comando: ${JSON.stringify(command)}`);
                } else if (transcript.includes('terminar')) {
                    modifyingObject = false;
                    console.log('Modificación del cubo finalizada.');
                }
            }
        });
    },
});

    
    // Componente para manejar el fondo (sky)
    AFRAME.registerComponent('sky-manager', {
        init: function () {
            const el = this.el;
            const scene = document.querySelector('a-scene');

            // Cambiar el color del fondo al entrar/salir del modo creación
            scene.addEventListener('enter-create-mode', () => {
                el.setAttribute('material', 'color:rgb(201, 224, 158)'); // Color azul claro
                console.log('Modo creación activado: color de fondo cambiado.');
            });
            scene.addEventListener('end-create-mode', () => {
                el.setAttribute('material', 'color:rgb(255, 198, 132)'); // Volver
                console.log('Modo creación desactivado: color de fondo restaurado.');
            });
            scene.addEventListener('exit-create-mode', () => {
                el.setAttribute('material', 'color:rgb(126, 126, 126)'); // Volver
                console.log('Modo creación desactivado: color de fondo restaurado.');
            });
        }
    });