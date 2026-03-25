
const loading = {
    show : () => {
        $('#loading').removeClass('d-none');
    },
    hide : () => {
        $('#loading').addClass('d-none');
    },
};

const reload_prests = (() => {
    return async () => {

        const prest_data = await (await fetch("/ytdlp/preset")).json();
        const html = Object.keys(prest_data).map(e => {
            return {name : e, data : prest_data[e]};
        }).filter(e => e.data.use).map(e => {
            console.log(e);
            return '<option value="'+(e.name)+'" json="'+JSON.stringify(e.data)+'">' +(e.name)+ '</option>'
        });

        html.push('<option selected value="" >未選択</option>');
        $("#preset-select").html(html.join('\r\n'));
    };
})();

const message = (() => {
    const modal = new bootstrap.Modal(document.getElementById('messageModal'), {keyboard: false});

    return (flg, option) => {
        
        if(option && option.text) $("#messageModalMessage").html(option.text);

        if(flg === true) modal.show();
        if(flg === false) modal.hide();
    };
})();

const submit_input = () => {
    const preset = $('[name=preset-select]').val().trim();
    console.log('preset: ' + preset);

    const url = $('[name=url-input]').val().trim();
    console.log('url: ' + url);

    if(preset === '' || url === '') {
        message(true, {text : '項目が未入力です。'});
        return false;
    }

    const data = {url : url, preset : preset};
    const promise = fetch('/ytdlp/process', {method: 'post',headers: {'Content-Type': 'application/json'},body: JSON.stringify(data)});

    handle_submit_promise(promise);
    return false;
};

const handle_submit_promise = async (promise) => {
    loading.show();

    const response = await promise;
    const json = await response.json();
    console.log(json);

    $('[name=url-input]').val('');
    message(true, {text : '処理ID : ' + json.processId});

    await reload_processes();

    setTimeout(() => {loading.hide()}, 300);
};

const show_process_detail = (() => {  
    const modal = new bootstrap.Modal(document.getElementById('processModal'), {keyboard: false});

    return async (e) => {
        loading.show();

        const pid = $(e).text();
        const process_data = await (await fetch("/ytdlp/status/"+pid)).json();
        console.log(process_data);
        
        $("#processModalLabel").html(process_data.meta.status);
        $('#processModalData').val(process_data.stream);

        setTimeout(() => {
            loading.hide();
            modal.show();
        }, 300);
    };
})();

const reload_processes = (() => {
    return async () => {
        const process_data = await (await fetch("/ytdlp/processes")).json();
        console.log(process_data);

        const html = process_data.map(e => {
            return '<a onclick="show_process_detail(this)" class="list-group-item d-flex justify-content-between align-items-center" href="#'+e+'" style="cursor: pointer;">'+e+'</a>'
        });
        $("#process-list-group").html(html.join('\r\n'));
    };
})();

$(async () =>  {
    await reload_prests();
    await reload_processes();
    setTimeout(() => {loading.hide()}, 300);
});