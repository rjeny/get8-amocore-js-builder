define(['jquery', 'FileAPI'], function ($, FileAPI) {
    var CustomWidget = function () {
        var self = this,
            version = '0.1.51',
            files = {},
            folder = '';

        /**
         * Возвращает уникальный для виджета id для привязки событий.
         * Для всех стилей корневой селектор [id^="<widget_name>"]
         *
         * @example название виджета – foo
         * self.id() #foo_widget
         * self.id('bar') #foo_widget_bar
         * self.id('', false) foo_widget
         * self.id('bar', false) foo_widget_bar
         * [id^="foo"] .some_style
         *
         * @param postfix string
         * @param hash bool
         * @return string
         */
        this.id = function (postfix, hash) {
            hash = typeof hash !== 'undefined' ? hash : true;
            postfix = typeof postfix !== 'undefined' ? postfix : '';

            return (hash ? '#' : '') + self.params.widget_code + '_widget' + (postfix ? '_' + postfix : '');
        };

        /**
         * Возвращает ссылку для обращения на сервер amocore.in
         *
         * @param controller string
         * @param method string
         * @param params array
         * @param dev bool
         * @return string
         */
        this.getUrl = function (controller, method, params, dev = false) {
            params = typeof params !== 'undefined' ? params : {};
            params = jQuery.param(params);

            return '/' + '/api.' + (dev ? 'dev-' : '') + 'amocore.in/' + self.system().subdomain + '/'
                + controller + '/' + method + '/' + self.get_settings().hash + (params ? '?' + params : '');
        };

        /**
         * Получение id сделки, если находимся в карточке сделки
         *
         * @returns integer|boolean
         */
        this.getLeadId = function() {
            if (AMOCRM.data.current_entity == 'leads') {
                return parseInt(AMOCRM.data.current_card.id);
            }

            return false;
        };

        /**
         * Возвращает html на основе встроенного twig-шаблона
         *
         * @param template string - имя шаблона
         * @param callback object - функция, в которой и происходит рендер шаблона
         * @return string
         */
        this.getTemplate = function (template, callback) {
            template = template || '';

            return self.render({
                href       : '/templates/' + template + '.twig',
                base_path  : self.params.path,
                v          : version,
                load       : callback
            }, {});
        };

        /**
         * Включение или выключение лоадера поверх всего виджета, чтобы блокировать
         *
         * @param show bool
         * @return void
         */
        this.loader = function (show) {
            show = typeof show !== 'undefined' ? show : true;

            if (show) {
                if (!$(this.id() + ' .widget-wrap .overlay-loader').length) {
                    $(this.id() + ' .widget-wrap').append('\
                <div class="overlay-loader">\
                    <span class="pipeline_leads__load_more__spinner spinner-icon spinner-icon-abs-center"></span>\
                </div>\
            ');
                }
            } else {
                $(this.id() + ' .widget-wrap .overlay-loader').remove();
            }
        };

        /**
         * Выводит уведомление об ошибк слева снизу
         *
         * @param header
         * @param text
         */
        this.error = function (text) {
            AMOCRM.notifications.add_error({
                header: 'Ошибка',
                text: text,
                date: Math.ceil(Date.now() / 1000),
            });
        };

        this.callbacks = {
            init: function () {

                return true;
            },

            onSave: function () {
                $.ajax({
                    type: 'POST',
                    url: self.getUrl('get_file', 'auth'),
                    dataType: 'json',
                    data: {
                        'client_id'  : $(self.id() + ' input[name=client_id]').val(),
                        'secret'     : $(self.id() + ' input[name=secret]').val(),
                        'folder'     : $(self.id() + ' input[name=folder]').val(),
                    },
                    success: function (response) {
                        if (response.success) {
                            if (response.data) {
                                // Редирект на страницу подтверждения
                                window.location.replace(response.data);
                            }
                        } else {
                            self.error('Ошибка при авторизации');
                        }
                    },
                    error: function () {
                        self.error('Ошибка при авторизации');
                    }
                });

                return true;
            },

            settings: function () {
                // Добавляем id к modal-body виджета
                $('#save_' + self.params.widget_code).closest('.modal-body').attr('id', self.id('', false));

                // Подключаем css
                if (!$('link[href="' + self.params.path + '/settings.css"]').length) {
                    $("head").append('<link rel="stylesheet" type="text/css" href="' + self.params.path + '/settings.css">');
                }

                // Вывод URL для разрешения редиректа в гугле
                self.getTemplate('uri', function (template) {
                    $(self.id() + ' .widget_settings_block__item_field:eq(3)').after(
                        template.render({
                            'uri': 'https:' + self.getUrl('get_file', 'auth')
                        })
                    );
                });

                // Включение выключение удаления файлов из карточки
                var deleteallow = '';
                if(self.get_settings().deleteallow === '')
                    deleteallow = 'no';
                else
                    deleteallow = $('.widget_settings_block__controls__[name="deleteallow"]').val();

                var deletedallowfield = $('.widget_settings_block__controls__[name="deleteallow"]');
                deletedallowfield.attr('type','hidden');

                // Вывод функции включения и выключения удаления из карточек
                self.getTemplate('deleteallow', function (template) {
                    $(deletedallowfield).after(
                        template.render({
                            'deleteallow': deleteallow
                        })
                    );
                });



                return true;
            },

            render: function () {
                if (self.system().area != 'settings') {
                    // Подключаем css
                    if (!$('link[href="' + self.params.path + '/widget.css"]').length) {
                        $("head").append('<link rel="stylesheet" type="text/css" href="' + self.params.path + '/widget.css">');
                    }

                    // Отрисовываем виджет справа
                    self.render_template({
                        caption:{
                            class_name: 'title-wrap',
                            html: ''
                        },
                        body: '',
                        render: '<div class="wrapper"><div class="widget-wrap"></div></div>'
                    });

                    // Добавляем id к виджету
                    $('div[data-code="' + self.params.widget_code + '"]').attr('id', self.id('', false));

                    self.loader(true);

                    // Получение списка существующих файлов на диске
                    $.ajax({
                        url: self.getUrl('get_file', 'get_files'),
                        type: 'GET',
                        dataType: 'json',
                        data: {
                            lead_id: self.getLeadId()
                        },
                        success: function (response) {
                            if (response.success) {
                                files = (!jQuery.isEmptyObject(response.data.files)) ? response.data.files : {};
                                folder = response.data.folder;

                                self.getTemplate('widget', function (template) {
                                    $(self.id() + ' .widget-wrap').html(
                                        template.render({
                                            'files': files,
                                            'folder': folder,
                                            'deleteallow': self.get_settings().deleteallow
                                        })
                                    );

                                    self.loader(false);
                                });
                            } else {
                                self.loader(false);

                                $(self.id() + ' .widget-wrap').html('Неверные данные для авторизации');

                                self.error(response.error);
                            }
                        }
                    });
                }

                return true;
            },

            bind_actions: function () {
                // Удаляем существующие эвенты
                $(document).off(self.ns);

                if (self.system().area != 'settings') {
                    // Загрузка файла
                    $(document).on('change' + self.ns, self.id() + ' .files-upload', function(e) {
                        e.stopPropagation();
                        e.preventDefault();

                        var $this = $(this);

                        $this.trigger('button:save:disable');

                        self.loader(true);

                        // Собираем все пересылаемые данные в FormData
                        var formData = new FormData();
                        formData.append('lead_id', self.getLeadId());
                        formData.append('folderName', $this.attr('data-folder'));
                        $.each($this[0].files, function(i, file) {
                            formData.append('file' + i, file);
                        });

                        $.ajax({
                            type: 'POST',
                            dataType: 'json',
                            url: self.getUrl('get_file', 'post_files'),
                            data: formData,
                            cache: false,
                            contentType: false,
                            processData: false,
                            success: function (response) {
                                if (response.success) {
                                    if (!jQuery.isEmptyObject(response.data)) {
                                        self.getTemplate('widget', function (template) {
                                            $.extend(files, response.data.files);
                                            folder = response.data.folder;

                                            $(self.id() + ' .widget-wrap').html(
                                                template.render({
                                                    'files': files,
                                                    'folder': folder,
                                                })
                                            );

                                            self.loader(false);
                                            $this.trigger('button:saved', [function () {
                                                $this.trigger('button:save:enable');
                                            }, 'Загружено']);
                                        });
                                    } else {
                                        self.loader(false);
                                        $this.trigger('button:save:enable');
                                    }

                                } else {
                                    self.loader(false);
                                    $this.trigger('button:save:enable');

                                    self.error('При загрузке файлов произошла ошибка.');
                                }
                            },
                            error: function () {
                                self.loader(false);

                                $this.trigger('button:save:enable');

                                self.error('На сервере произошла ошибка, попробуйте позже');
                            }
                        });
                    });

                    // Открытие окна папки сделки
                    $(document).on(AMOCRM.click_event + self.ns, self.id() + ' .open-folder', function(e) {
                        e.stopPropagation();
                        e.preventDefault();

                        window.open($(this).data('href'), '_blank');
                    });

                    // Открытие файла
                    $(document).on(AMOCRM.click_event + self.ns, self.id() + ' .item-filename-wrapper', function(e) {
                        e.stopPropagation();
                        e.preventDefault();

                        window.open($(this).data('href'), '_blank');
                    });

                    $(document).dnd(function(hover, e){
                        let $dropzone = $('.files-list');
                        if (e.target.classList.contains('files-list')){
                            if (hover){
                                $dropzone.addClass('to_upload');
                            } else {
                                $dropzone.removeClass('to_upload');
                            }
                        }
                    }, function(drop, e){console.log('drop')});

                    // document.addEventListener('dragenter', function (e) {
                    //     let $dropzone = $('.files-list');
                    //     $dropzone.find('*').hide();
                    //     $dropzone.find('.drop-zone').show();
                    // });
                    //
                    // document.addEventListener('dragleave', function (e) {
                    //     let $dropzone = $(self.id() + ' .files-list');
                    //     $dropzone.find('*').show();
                    //     $dropzone.find('.drop-zone').hide();
                    // });

                    // $(window).on('dragenter' + self.ns, function(e) {
                    //     let $dropzone = $(self.id() + ' .files-list');
                    //     $dropzone.find('*').hide();
                    //     $dropzone.find('.drop-zone').show();
                    // });

                    // $(window).on('dragleave' + self.ns, function(e) {
                    //     let $dropzone = $(self.id() + ' .files-list');
                    //     $dropzone.find('*').show();
                    //     $dropzone.find('.drop-zone').hide();
                    // });

                    // $(document).on('dragenter', self.id() + ' .drop-zone', function(e) {
                    //     $(this).find('.drop-zone').css('opacity', '1');
                    // });
                    //
                    // $(document).on('dragleave', self.id() + ' .drop-zone', function(e) {
                    //     $(this).find('.drop-zone').css('opacity', '0.7');
                    // });
                    //
                    // $(document).on('drop', self.id() + ' .drop-zone', function(e) {
                    //     e.preventDefault();
                    //     alert();
                    // });

                    $(document).on(AMOCRM.click_event + self.ns, self.id() + ' .widget-wrap > label', function (e) {
                        $(this).next().toggle();
                    });

                    // Удаление файла
                    $(document).on(AMOCRM.click_event + self.ns, self.id() + ' .item-file-remove', function() {
                        var $file = $(this).closest('.file');

                        self.loader(true);

                        $.ajax({
                            url: self.getUrl('get_file', 'delete_file'),
                            type: 'POST',
                            dataType: 'json',
                            data: {
                                lead_id: self.getLeadId(),
                                file_id: $file.data('id'),
                                file_name: $file.find('.item-filename-wrapper').html().trim(),
                            },
                            success: function (response) {
                                self.loader(false);

                                if (response.success) {
                                    delete files[$file.data('id')];
                                    $file.remove();
                                } else {
                                    self.error('Произошла ошибка на сервере. Попробуйте позже.');
                                }
                            }
                        });
                    });

                    // Скачивание файла
                    $(document).on(AMOCRM.click_event + self.ns, self.id() + ' .item-file-download', function() {
                        var $file = $(this).closest('.file');

                        $("<iframe/>").attr({
                            src: self.getUrl('get_file', 'download_file', {
                                file_id: $file.data('id'),
                                file_name: $file.find('.item-filename-wrapper').html().trim()
                            }),
                            style: "visibility:hidden;display:none"
                        }).appendTo('body');
                    });
                }
                else {
                    $(document).on(AMOCRM.click_event, '#getfile_deleteallow', function () {
                        var field = $('.widget_settings_block__controls__[name="deleteallow"]');

                        if($(this).hasClass('switcher__on')){
                            field.val('yes');
                        } else {
                            field.val('no');
                        }
                        field.trigger('change');
                    } )
                }

                return true;
            },

            destroy: function () {
                return true;
            }
        };

        return this;
    };

    return CustomWidget;
});
