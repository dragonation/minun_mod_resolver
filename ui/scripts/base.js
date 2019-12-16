$(() => {

    $.res.package("/ui/~package.json", true, () => {

        require("./base/meta.js");
        require("./base/logger.js");

        require("./base/worker.js");
        require("./base/dom.js");

        let uuid = require("./base/uuid.js");
        $.uuid = uuid.createUUID;

        let timer = require("./base/timer.js");
        $.delay = timer.delay;
        $.timer = timer.timer;

        let tmpl = require("./base/tmpl.js");

        $.format = tmpl.parseTemplate.bind(global);

        $.format.compile = tmpl.compileTemplate.bind(global);
        $.format.closure = tmpl.createTemplateClosure.bind(global);

        $.format.opts = tmpl.prepareTemplateOptions.bind(global);

        $.format.functors = tmpl.templateFunctors;
        $.format.parsers = tmpl.templateParsers;

        $.format.tmpl = tmpl.executeTemplateCall.bind(global);
        $.format.tmpl.compile = tmpl.compileTemplateCall.bind(global);
        $.format.tmpl.closure = tmpl.createTemplateCallClosure.bind(global);
        $.format.tmpl.jit = tmpl.jitTemplateCall.bind(global);
        $.format.tmpl.deps = tmpl.resolveTemplateDependencies.bind(global);
        $.format.tmpl.deps.changed = tmpl.isTemplateDependenciesChanged.bind(global);
        $.format.tmpl.param = tmpl.snapshotTemplateParameters.bind(global);

        $.format.tmpl.utils = Object.create(null);
        $.format.tmpl.utils.tokenizeSymbol = tmpl.getTemplateSymbol.bind(global);
        $.format.tmpl.utils.convertQueue = tmpl.convertTemplateQueue.bind(global);
        $.format.tmpl.utils.convertOperator = tmpl.convertTemplateOperator.bind(global);
        $.format.tmpl.utils.convertCall = tmpl.convertTemplateCall.bind(global);
        $.format.tmpl.utils.convertSugar = tmpl.convertTemplateSugar.bind(global);
        $.format.tmpl.utils.convertBracket = tmpl.convertTemplateBracket.bind(global);

        $.format.tmpl.utils.getCallAction = tmpl.getTemplateSymbol.bind(global);

        $.format.tmpl.utils.tokens = tmpl.templateTokens;

        require("./base/tag.js");
        for (let tag of $.metas("tag.reg", "tag")) {
            $.dom.autoregisterTag(tag);
        }

        require("./base/serial.js");

        let starter = $.meta("starter", "file");
        if (!starter) {
            console.warn("Starter file not found");
        }

        require(`../${starter}`);

    });

});
