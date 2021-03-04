class UI {
    constructor(elms) {
        this.populationInput = elms.populationInput;
        this.fitnessInput = elms.fitnessInput;
        this.frequencyInput = elms.frequencyInput;
        this.textInput = elms.textInput;
        this.generateButton = elms.generateButton;

        this.canvasA = elms.canvasA;
        this.canvasB = elms.canvasB;
        this.currentGeneration = elms.currentGeneration;
        this.currentFitness = elms.currentFitness;
        this.outputLog = elms.outputLog;
        this.outputLogTemplate = elms.outputLogTemplate;

        // ensure dimensions match
        this.canvasB.width = this.canvasA.width;
        this.canvasB.height = this.canvasA.height;
    }

    drawTextHandler(evt) {
        const ctx = this.canvasA.getContext('2d');

        const width = this.canvasA.width;
        const height = this.canvasA.height;
        ctx.clearRect(0, 0, width, height);

        ctx.font = '72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black';
        ctx.fillText(evt.target.value, width / 2, height / 2);
    }

    clearOutputs() {
        const ctx = this.canvasB.getContext('2d');
        ctx.clearRect(0, 0, this.canvasB.width, this.canvasB.height);

        this.currentGeneration.innerText = '0';
        this.currentFitness.innerText = '∞';
        this.outputLog.innerText = '';
    }

    logGeneration(value) {
        this.currentGeneration.innerText = value;
    }

    logFitness(value) {
        this.currentFitness.innerText = value;
    }

    updateLog() {
        const logEntry = this.outputLogTemplate.content.cloneNode(true);
        logEntry.querySelector('.img').src = this.canvasB.toDataURL();
        logEntry.querySelector('.output-generation').textContent = this.currentGeneration.innerText;
        logEntry.querySelector('.output-fitness').textContent = this.currentFitness.innerText;
        this.outputLog.appendChild(logEntry);
    }

    disableInputs(isDisabled) {
        this.populationInput.disabled = isDisabled;
        this.fitnessInput.disabled = isDisabled;
        this.frequencyInput.disabled = isDisabled;
        this.textInput.disabled = isDisabled;
    }

    toggleGenerateButtonLabel(isGenerating) {
        this.generateButton.innerText = (isGenerating) ? 'Stop' : this.generateButton.dataset.label;
    }
}

class Simulation {
    constructor(ui) {
        this.generation = 0;
        this.timeout = null;

        this.populationInput = ui.populationInput;
        this.fitnessInput = ui.fitnessInput;

        this.ctxA = ui.canvasA.getContext('2d');
        this.ctxB = ui.canvasB.getContext('2d');
        this.width = ui.canvasA.width;
        this.height = ui.canvasA.height;

        this.ui = ui;
    }

    get isRunning() {
        return this.timeout !== null;
    }

    // Generate a random integer [0 - max)
    randInt(max) {
        return Math.floor(Math.random() * max);
    }

    // Generate a random color hexcode
    randColor() {
        return '#' + Math.random().toString(16).substr(2, 6);
    }

    // Calcualte perceptual/weighted mean square error between two images
    mseImagePerceptual(imageA, imageB, width, height) {
        // pixel data is [R,G,B,A]
        let errors = [0, 0, 0, 0];

        let numPixels = width * height;
        for (let i = 0; i < numPixels; i++) {
            let pixel = i * 4;
            for (let color = 0; color < 4; color++) {
                errors[color] += Math.pow(imageA[pixel + color] - imageB[pixel + color], 2);
            }
        }
        errors = errors.map(error => error / numPixels);

        // weights based on humans light perception
        return errors[0] * 0.212656 + errors[1] * 0.715158 + errors[2] * 0.072186 + errors[3];
    }

    // Calcualte mean square error between two images' alpha channels
    mseImageAlpha(imageA, imageB, width, height) {
        let error = 0;
        let numPixels = width * height;
        for (let i = 0; i < numPixels; i++) {
            let alphaIndex = (i * 4) + 3;
            error += Math.pow(imageA[alphaIndex] - imageB[alphaIndex], 2);
        }
        return error / numPixels;
    }

    logGeneration() {
        this.ui.logGeneration(this.generation);
    }

    logFitness(fitness) {
        this.ui.logFitness(fitness);
    }

    runGeneration() {
        this.logGeneration(this.generation);

        const imageA = this.ctxA.getImageData(0, 0, this.width, this.height);
        const imageB = this.ctxB.getImageData(0, 0, this.width, this.height);
        let bestOffspring = imageB;

        let bestFitness = this.mseFunc(imageA.data, imageB.data, this.width, this.height);

        for (let i = 0; i < this.population; i++) {
            // mutate
            this.ctxB.putImageData(imageB, 0, 0);
            for (let j = 0; j < 5; j++) {
                this.ctxB.clearRect(this.randInt(this.width), this.randInt(this.height), this.randInt(this.width / 10), this.randInt(this.height / 10));

                this.ctxB.beginPath();
                this.ctxB.arc(this.randInt(this.width), this.randInt(this.height), this.randInt(5), 0, 2 * Math.PI);
                this.ctxB.fillStyle = this.randColor();
                this.ctxB.fill();
            }

            // only the strong survive!
            let fitness = this.mseFunc(
                imageA.data,
                this.ctxB.getImageData(0, 0, this.width, this.height).data,
                this.width, this.height
            );
            if (fitness < bestFitness) {
                bestOffspring = this.ctxB.getImageData(0, 0, this.width, this.height);
                bestFitness = fitness;
                this.logFitness(fitness);
            }
        }
        this.ctxB.putImageData(bestOffspring, 0, 0);
    }

    run() {
        if (this.timeout !== null) {
        this.generation++;

        this.runGeneration();
        if (this.generation % this.ui.frequencyInput.value == 0) {
            this.ui.updateLog();
        }

            setTimeout(this.run.bind(this), 10);
        }
    }

    start() {
        this.population = this.populationInput.value;

        switch (this.fitnessInput.value) {
            case 'perceptual':
                this.mseFunc = this.mseImagePerceptual;
                break;
            case 'alpha':
                this.mseFunc = this.mseImageAlpha;
                break;
            default:
        }

        this.timeout = setTimeout(this.run.bind(this), 10);
    }

    stop() {
        this.generation = 0;
        clearTimeout(this.timeout);
        this.timeout = null;
    }
}

(() => {
    const ui = new UI({
        populationInput: document.getElementById('population-input'),
        fitnessInput: document.getElementById('fitness-input'),
        frequencyInput: document.getElementById('frequency-input'),
        textInput: document.getElementById('text-input'),
        generateButton: document.getElementById('generate-button'),
        canvasA: document.getElementById('canvas-a'),
        canvasB: document.getElementById('canvas-b'),
        currentGeneration: document.getElementById('current-generation'),
        currentFitness: document.getElementById('current-fitness'),
        outputLog: document.getElementById('output-log'),
        outputLogTemplate: document.getElementById('output-log-template')
    });

    const simulation = new Simulation(ui);

    ui.textInput.addEventListener('keyup', ui.drawTextHandler.bind(ui));

    ui.generateButton.addEventListener('click', (evt) => {
        if (!simulation.isRunning) {
            ui.disableInputs(true);
            ui.toggleGenerateButtonLabel(true);
            ui.clearOutputs();
            simulation.start();
        } else {
            simulation.stop();
            ui.disableInputs(false);
            ui.toggleGenerateButtonLabel(false);
        }
    });
})();
