(() => {
   const createElement = (type, props, ...children) => {
       if(props === null) props = {}
       return {type, props, ...children}
   }

   const render = (vdom, parent=null) => {
       const mount = parent ? (el => parent.appendChild(el)) : (el => el)

       if(typeof vdom === 'string' || typeof vdom === 'number'){
           return mount(document.createTextNode(vdom))
       }else if(typeof vdom === 'boolean' || vdom === null){
           return mount(document.createTextNode(''))
       }else if(typeof vdom === 'object' && typeof vdom.type === 'function'){
           return Component.render(vdom, parent)
       }else if(typeof vdom === 'object' && typeof vdom.type === 'string'){
           const dom = mount(document.createElement(vdom.type))

           for(const child of [].concat(...vdom.children)){
               render(child, dom)
           }

           for(const prop in vdom.props){
               setAttribute(dom, prop, vdom.props[prop])
           }

           return dom
       }else{
           throw new Error(`Invalid vdom: ${vdom}`)
       }
   }

   const setAttribute = (dom, key, value) => {
       if(typeof value === 'function' && key.startsWith('on')){
           const eventType = key.slice(2).toLowerCase()

           dom.__handlerEvents = dom.__handlerEvents || {}
           dom.removeEventListener(eventType, dom.__handlerEvents[eventType])
           dom.__handlerEvents[eventType] = value
           dom.addEventListener(eventType, dom.__handlerEvents[eventType])
       }else if(key === 'checked' || key === 'value' || key === 'className'){
           dom[key] = value
       }else if(key === 'style' && typeof value === 'object'){
           Object.assign(dom.style, value)
       }else if(key === 'ref' && typeof value === 'function'){
           value(dom)
       }
   }

   const patch = (dom, vdom, parent=dom.parentNode) => {
       const replace = parent ? el => (parent.replaceChild(el, dom) && el) : (el => el)

       if(typeof vdom === 'object' && typeof vdom.type === 'function'){
           return Component.patch(dom, vdom, parent)
       }else if(typeof vdom !== 'object' && dom instanceof Text){
           return dom.textContent !== vdom ? replace(render(vdom, parent)) : dom
       }else if(typeof vdom === 'object' && dom instanceof Text){
           return repalce(render(vdom, parent))
       }else if(typeof vdom === 'object' && dom.nodeName !== vdom.type.toUpperCase()){
           return replace(render(vdom, parent))
       }else if(typeof vdom === 'object' && dom.nodeName === vdom.type.toUpperCase()){
           const pool = {}
           const active = document.activeElement()

           [].concat(...dom.childNodes).map((child, index) => {
               const key = child.__handlerKey || `__index_${index}`
               pool[key] = child
           })

           [].concat(...vdom.children).map((child, index) => {
               const key = child.props && child.props.key || `__index_${index}`
               dom.appendChild(pool[key] ? patch(pool[key], child) : render(child, dom))
               delete pool[key]
           })

           for(const key in pool){
               const instance = pool[key].__handlerInstance
               if(instance){
                   instance.componentWillUnmount()
               }
               pool[key].remove()
           }

           for(const attr of dom.attributes) dom.removeAttribute(attr.name)
           for(const prop in vdom.props) setAttribute(dom, prop, vdom.props[prop])
           active.focus()
           return dom
       }
   }

   class Component{
       constructor(props){
           this.props = props || {}
           this.state = null
       }

       static render(vdom, parent=null){
           const props = Object.assign({}, vdom.props, {children: vdom.children})

           if(Component.isPrototypeOf(vdom.type)){
               const instance = new (vdom.type)(props)
               instance.componentWillMount()
               instance.common = render(instance.render(), parent)
               instance.common.__handlerInstance = instance
               instance.common.__handlerKey = vdom.props.key
               instance.componentDidMount()
               return instance.common
           }else{
               return render(vdom.type(props), parent)
           }
       }

       static patch(dom, vdom, parent=dom.parentNode){
           const props = Object.assign({}, vdom.props, {children: vdom.children})

           if(dom.__handlerInstance && dom.__handlerInstance.constructor === vdom.type){
               dom.__handlerInstance.componentWillReceiveProps(props)
               dom.__handlerInstance.props = props
               return patch(dom, dom.__handlerEvents.render(), parent)
           }else if(Component.isPrototypeOf(vdom.type)){
               const ndom = Component.render(vdom, parent)
               return parent ? (parent.replaceChild(ndom, dom) && ndom) : (ndom)
           }else if(!Component.isPrototypeOf(vdom.type)){
               return patch(dom, vdom.type(props), parent)
           }
       }

       setState(nextState){
           if(this.common && this.shouldComponentUpdate(this.props, nextState)){
               const prevState = this.state
               this.componentWillUpdate(this.props, nextState)
               this.common = nextState
               patch(this.common, this.render())
               this.componentDidUpdate(this.props, prevState);
           }else{
               this.state = nextState
           }
       }

       shouldComponentUpdate(nextProps, nextState) {
            return nextProps !== this.props || nextState !== this.state
       }

       componentWillReceiveProps(nextProps){
           return undefined
       }

       componentWillUpdate(nextProps, nextState){
           return undefined
       }

       componentDidUpdate(prevProps, prevState){
           return undefined
       }

       componentWillMount(){
           return undefined
       }

       componentDidMount(){
           return undefined
       }

       componentWillUnmount(){
           return undefined
       }
   }
  
  if (typeof module != 'undefined'){
      module.exports = {
          createElement, 
          render, 
          Component
      }
  };
  if (typeof module == 'undefined'){
      window.miniReact  = {
          createElement, 
          render, 
          Component
      }
  };
})()
