const Loki = {
  components: {},
  aux: {}
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

Loki.ajax = function(url, method, data) {
  const timeout = 5000;
  method || (method = 'get');
  method = method.toUpperCase();

  return new Promise(function(res, rej) {
    if(!url) {
      rej({error: 'No se paso una url valida' });
      return;
    }

    for(const key in data) {
      if((typeof data[key]) == 'object') {
        rej({ error: 'Los datos enviados no son validos, tiene claves cuyo valores son objetos' });
        return;
      }
    }

    data = new URLSearchParams(data).toString();

    var request = new XMLHttpRequest();
 
    request.onreadystatechange = function() {
      if(request.readyState === 4) {
        if(request.status === 200) {
          res({ data: request.responseText });
        } else {
          rej({ error: request.statusText });
        } 
      }
    }

    setTimeout(function() {
      rej({ error: 'Tiempo de espera agotado' });
    }, timeout);
    
    request.open(method, url);
    request.send(data);
  });
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

Loki.aux.normalize = function(string) {
  return string.trim()
               .toLowerCase()
               .normalize("NFD")
               .replace(/[\u0300-\u036f]/g, "");
}

Loki.aux.levenshteinDistance = function(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(function () {
    return Array(str1.length + 1).fill(null);
  });

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return track[str2.length][str1.length];
}

Loki.search = function(search, array) {
  search = search.split(' ')
                 .map(function(k) {
                    k = Loki.aux.normalize(k);
                    k.trim();
                    return k;
                 }).filter(Boolean);

  const _array = JSON.parse(JSON.stringify(array)),
        results = _array.map(function(item) {
          item.score = 0;
          search.forEach(function(searchKey) {
            item.keywords.forEach(function(keyword) {
              const _keyword = keyword.slice(0, searchKey.length);
              item.score += Loki.aux.levenshteinDistance(searchKey, _keyword);
            });
          });

          console.log(JSON.parse(JSON.stringify(item)))

          return item;
        }).sort(function(a, b) {
          return b.score - a.score;
        });

  return results;
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

Loki.UUID = function() {
  var d = new Date().getTime();
  var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16;
      if(d > 0) {
          r = (d + r)%16 | 0;
          d = Math.floor(d/16);
      } else {
          r = (d2 + r)%16 | 0;
          d2 = Math.floor(d2/16);
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

Loki.create = function(component, root) {
  root || (root = document.body);

  if(!component) {
    throw Error('No se especifico un componente');
  }

  component = Object.create(Loki.components[component]);
  component.root = root;

  return component;
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

Loki.component = function(tpl, hook) {
  this.tpl = tpl;
  this.root = document.body;

  if(typeof hook != "function") {
    this.hook = function() {};
    return;
  }

  this.hook = hook;
}

Loki.component.prototype.place = function(targets, data) {
  const self = this;

  if(!targets) {
    throw Error('No se especificaron los targets');
  }

  if(typeof targets == 'string') {
    targets = targets.split(',');
  }

  if(!Array.isArray(targets)) {
    targets = [targets];
  }

  data || (data = {});

  self.component = Loki.render(self.tpl, data);

  targets.forEach(function(target) {
    const _targets = self.root.querySelectorAll('[data-is="' + target + '"]');
    if(_targets.length == 0) {
      console.log('No existen targets con ese ID');
    }
    _targets.forEach(function(elm) {
          elm.innerHTML = self.component;
          self.hook(elm, data);
        });
  });
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------