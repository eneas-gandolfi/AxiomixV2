const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk(path.join(__dirname, '../src'));
let issues = [];

const rules = [
  { p: /\bnao\b/g, r: 'não' },
  { p: /\bsao\b/g, r: 'são' },
  { p: /\b(U|u)suario(s)?\b/g, r: '$1suário$2' },
  { p: /\b(H|h)istorico(s)?\b/g, r: '$1istórico$2' },
  { p: /\b(R|r)elatorio(s)?\b/g, r: '$1elatório$2' },
  { p: /\b(C|c)onfiguracoes\b/g, r: '$1onfigurações' },
  { p: /\b(A|a)coes\b/g, r: '$1ções' },
  { p: /\b(O|o)pcoes\b/g, r: '$1pções' },
  { p: /\b(A|a|Uma|uma|Sem|sem|das) analise(s)?\b/g, r: '$1 análise$2' }, 
  { p: /\b(a|na|sua|para|de) analise(s)?\b/g, r: '$1 análise$2' }, 
  { p: /\batraves\b/g, r: 'através' },
  { p: /\b(M|m)odulo(s)?\b/g, r: '$1ódulo$2' },
  { p: /\b(P|p)agina(s)?\b/g, r: '$1ágina$2' },
  { p: /\b(E|e)statistica(s)?\b/g, r: '$1statística$2' },
  { p: /\b(H|h)orario(s)?\b/g, r: '$1orário$2' },
  { p: /\b(M|m)etrica(s)?\b/g, r: '$1étrica$2' },
  { p: /\b(S|s)intese(s)?\b/g, r: '$1íntese$2' },
  { p: /\b(A|a)pos\b/g, r: '$1pós' },
  { p: /\b(A|a)te\b/g, r: '$1té' },
  { p: /\b(A|a)tualizacao(coes)?\b/g, r: '$1tualização' },
  { p: /\b(A|a)tualizacoes\b/g, r: '$1tualizações' },
  { p: /\b(C|c)onclusao\b/g, r: '$1onclusão' },
  { p: /\b(C|c)onexoes\b/g, r: '$1onexões' },
  { p: /\b(C|c)onfiguracao\b/g, r: '$1onfiguração' },
  { p: /\b(D|d)escricao\b/g, r: '$1escrição' },
  { p: /\b(F|f)uncao\b/g, r: '$1unção' },
  { p: /\b(F|f)uncoes\b/g, r: '$1unções' },
  { p: /\b(F|f)uncionalidade(s)?\b/g, r: '$1uncionalidade$2' },
  { p: /\b(G|g)eracao\b/g, r: '$1eração' },
  { p: /\b(I|i)nformacao(coes)?\b/g, r: '$1nformação' },
  { p: /\b(I|i)nformacoes\b/g, r: '$1nformações' },
  { p: /\b(O|o)pcao\b/g, r: '$1pção' },
  { p: /\b(P|p)adrao(oes)?\b/g, r: '$1adrão' },
  { p: /\b(P|p)adroes\b/g, r: '$1adrões' },
  { p: /\b(P|p)ublicacao(coes)?\b/g, r: '$1ublicação' },
  { p: /\b(P|p)ublicacoes\b/g, r: '$1ublicações' },
  { p: /\b(R|r)ecomendacao(coes)?\b/g, r: '$1ecomendação' },
  { p: /\b(R|r)ecomendacoes\b/g, r: '$1ecomendações' },
  { p: /\b(S|s)olucao(coes)?\b/g, r: '$1olução' },
  { p: /\b(S|s)olucoes\b/g, r: '$1oluções' },
  { p: /\b(V|v)ersao(oes)?\b/g, r: '$1ersão' },
  { p: /\b(V|v)ersoes\b/g, r: '$1ersões' },
  { p: /\b(i)ncluida(s)?\b/g, r: '$1ncluída$2' }, 
  { p: /\b(I)ncluida(s)?\b/g, r: '$1ncluída$2' }, 
  { p: /\b(u)sara\b/g, r: '$1sará' }, 
  { p: /\b(U)sara\b/g, r: '$1sará' }, 
  { p: /\bcatalogos\b/g, r: 'catálogos' },
  { p: /\btecnicos\b/g, r: 'técnicos' },
  { p: /\b(C|c)oncluido\b/g, r: '$1oncluído' }, 
  { p: /\b(C|c)oncluida\b/g, r: '$1oncluída' },
  { p: /\b(I|i)nteligencia\b/g, r: '$1nteligência' },
  { p: /\b(G|g)uardar\b/, r: 'Salvar' }, // Some generic ones if needed, but wait, maybe not.
  { p: /\bNao\b/g, r: 'Não' },
  { p: /\bSao\b/g, r: 'São' }
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  rules.forEach(rule => {
    content = content.replace(rule.p, (match, p1, p2) => {
        let r = rule.r;
        if (p1 !== undefined) r = r.replace('$1', p1);
        if (p2 !== undefined) r = r.replace('$2', p2);
        return r;
    });
  });

  if (content !== original) {
    issues.push(file);
    fs.writeFileSync(file, content);
  }
});

console.log('Fixed', issues.length, 'files.');
console.log(issues);
