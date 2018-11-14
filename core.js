(() => {
   const createElement = (type, props, ...children) => {
       if(props === null) props = {}

       return {type, props, children}
   }

  const render = (vdom, parent=null) => {
      const mount = parent ? (el) => parent.appendChild(el) : (el => el)

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
          throw new Error(`unknow vdom type: ${vdom} `)
      }
  }

  const setAttribute = (dom, key, value) => {
      if(typeof value === 'function' && key.startsWith('on')){
          const eventType = key.slice(2).toLowerCase()
          dom._handlerControl = dom._handlerControl || {}
          dom.removeEventListener(eventType, dom._handlerControl[eventType])
          dom._handlerControl[eventType] = value
          dom.addEventListener(eventType, dom._handlerControl[eventType])
      }else if(key === 'checked' || key === 'value' || key === 'className'){
          dom[key] = value
      }else if(key === 'style' && typeof value === 'object'){
          Object.assign(dom.style, value)
      }else if(key === 'ref' && typeof value === 'function'){
          value(dom)
      }else if(key === 'key'){
          dom._hadnlerKey = value
      }else if(typeof value !== 'object' && typeof value !== 'funciton'){
          dom.setAttribute(key, value)
      }
  }

  const patch = (dom, vdom, parent=dom.parentNode) => {
      const replace = parent ? el => (parent.replaceChild(el, dom) && el) : (el > el)

      if(typeof vdom == 'object' && typeof vdom.type === 'function'){
          return Component.patch(dom, vdom, parent)
      }else if(typeof vdom !== 'object' && dom instanceof Text){
          return dom.textContent !== vdom ? replace(render(vdom, parent)) : dom
      }else if(typeof vdom === 'object' && dom instanceof Text){
          return replace(render(vdom, parent))
      }else if(typeof vdom === 'object' && dom.nodeName !== vdom.type.toUpperCase()){
          return replace(render(vdom, parent))
      }else if(typeof vdom === 'object' && dom.nodeName === vdom.type.toUpperCase()){
          const self = {}
          const active = document.activeElement

          [].concat(...dom.childNodes).map((child, index) => {
              const key = child._hadnlerKey || `_index_${index}`
              self[key] = child
          })

          [].concat(...vdom.children).map((child, index) => {
              const key = child.props && child.props.key || `_index_${index}`
              dom.appendChild(self[key] ? patch(self[key], child) : render(child, dom))
              delete self[key]
          })

          for(const key in self){
              const instance = self[key]._handleInstance
              if(instance) instance.componentWillUnmount()
              self[key].remove()
          }

          for(const attr of dom.attribute){
              dom.removeAttribute(attr.name)
          }

          for(const prop in vdom.props){
              setAttribute(dom, prop, vdom.props[prop])
          } 

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
              instacne.componentWillMount()
              instance.base = render(instacne.render(), parent)
              instance.base._handleInstance = instance
              instance.base._hadnlerKey = vdom.props.key
              instacne.componentDidMount()
              return instance.base
          }else{
              return render(vdom.type(props), parent)
          }
      }

      static patch(dom, vdom, parent=dom.parentNode){
          const props = Object.assign({}, vdom.props, {children: vdom.children})

          if(dom._handleInstance && dom._handleInstance.constructor === vdom.type){
              dom._handleInstance.componentWillReceiveProps(props)
              dom._handleInstance.props = props
              return patch(dom, dom._handleInstance.render(), parent)
          }else if(Component.isPrototypeOf(vdom.type)){
              const ndom = Component.render(vdom, parent)
              return parent ? (parent.repalceChild(ndom, dom) && ndom) : (ndom)
          }else if(!Component.isPrototypeOf(vdom.type)){
              return patch(dom, vdom.type(props), parent)
          }
      }

      setState(nextState){
          if(this.base && this.shouldComponentUpdate(this.props, nextState)){
              const prevState = this.state
              this.componentWillUpdate(this.props, nextState)
              this.state = nextState
              patch(this.state, this.render())
              this.componentDidUpdate(this.props, prevState)
          }else{
              this.state = nextState
          }
      }

      shouldComponentUpdate(nextProps, nextState){
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
      window.Gooact  = {
          createElement, 
          render, 
          Component
      }
  };
})()
