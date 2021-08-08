var $PokeRandom = $PokeRandom || {};

/**
 * 1. Can only have one Pokemon per post
 * 2. Infinite numbers of edits to the post should only ever generate the same Pokemon
 * 3. If an attempt is made to add more than one Pokemon per post, do not allow saving the post
 * 4. "Encrypt" the Pokemon stored in a hidden field with the post
 * 5.
 */

$PokeRandom.Def = {
    settings: proboards.plugin.get('pokemon_randomizer').settings,
    images: proboards.plugin.get('pokemon_randomizer').images,
    tag: '[randomPokemon]',

    execute: function (fx) {
        console.log(fx);
    },

    bbEditorInsert: function (oUI) {
        oUI.replaceSelection('[randomPokemon]')
    },

    visualEditorInsert: function (oUI) {
        oUI.replaceSelection(oUI.document.createTextNode($PokeRandom.Def.tag));
    },

    resolveImage: function (path) {
        return path ? ($PokeRandom.Def.images[path] || path) : path;
    },

    getFormMessage: function() {
        return $('.form_post_new,.form_post_edit,.form_thread_new,.form_thread_edit,.form_post_quick_reply,.form_conversation_new,.form_message_new').find('textarea[name="message"]');
    },

    substituteFormMessage: function (newMessage) {
        $PokeRandom.Def.getFormMessage().val(newMessage);
    },

    isValidMessage: function() {
        return $PokeRandom.Def.getFormMessage().val().split($PokeRandom.Def.tag).length <= 2;
    },

    executeSubstitution() {
        var messageText = $PokeRandom.Def.getFormMessage().val();
        if (messageText.indexOf($PokeRandom.Def.tag) === -1) {
            return;
        }

        var subbedText = messageText.replace($PokeRandom.Def.tag, '[font color="disable"]pokemon sub[/font] ' + $PokeRandom.Def.tag);
        $PokeRandom.Def.substituteFormMessage(subbedText);
    },

    hook: function () {
        var wysiwyg = jQuery.ui.wysiwyg.prototype,
            bbcodeEditor = wysiwyg['_bbcodeEditor'],
            visualEditor = wysiwyg['_visualEditor'],
            createFn = wysiwyg['_create'],
            buildControlsFn = wysiwyg['_buildControls'],
            toHtmlFn = wysiwyg['bbcode2html'],
            toBbFn = wysiwyg['html2bbcode'],
            id = 'randomPokemon';

        // Validator to ensure only one random pokemon per post
        jQuery.check_one_random_pokemon = function(messageText) {
            return messageText.split($PokeRandom.Def.tag).length <= 2;
        };

        wysiwyg['_create'] = function () {
            createFn.call(this);
            console.log('In create fn');
        };

        wysiwyg['_buildControls'] = function (a0_, a1_, a2_) {
            window['wysiwyg_buttons'][id] = $PokeRandom.Def.imageUrl;
            buildControlsFn.call(this, a0_, a1_, a2_);
        };

        $([bbcodeEditor, visualEditor]).each(function (i_) {
            this['controls'][id] = {title: 'Random Pokemon'};
            this['controlGroups'][1][1].push(id);
            this['commands'][id] = i_ ? $PokeRandom.Def.visualEditorInsert : $PokeRandom.Def.bbEditorInsert;
        });

        // These are only used for switching between preview and non/preview
        wysiwyg['html2bbcode'] = function (param1, param2) {
            console.log(param1, param2);
            toBbFn.call(this, param1, param2);
        };

        wysiwyg['bbcode2html'] = function (param1, param2) {
            console.log(param1, param2);
            toHtmlFn.call(this, param1, param2);
        };

        var form = jQuery.ui.form.prototype,
            formCreateFn = form['_create'];

        form['_create'] = function () {
            var thisCreate = this;
            var beforeSubmitFn = this.options['beforeSubmit'];
            this.options['beforeSubmit'] = function () {
                if (beforeSubmitFn.call(thisCreate) === false) {
                    return false;
                }

                if (!$PokeRandom.Def.isValidMessage()) {
                    proboards.alert('Too many random Pokemon', 'You may only have one random Pokemon per post.', {modal: true});
                    return false;
                }

                $PokeRandom.Def.executeSubstitution();
            }
            formCreateFn.call(this);
        }
    },

    init: function () {
        $PokeRandom.Def.imageUrl = $PokeRandom.Def.resolveImage($PokeRandom.Def.settings['edurl']) || $PokeRandom.Def.images['insert'];
        $PokeRandom.Def.hook();
    }
};
