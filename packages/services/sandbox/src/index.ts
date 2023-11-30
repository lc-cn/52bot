import { Dict, Plugin } from '52bot';
import { Component } from '@/component';

declare module '52bot' {
  namespace App {
    interface Services {
      defineComponent: typeof Component.define;
      components: typeof Component.components;
    }
  }
}
const sandbox = new Plugin('沙箱环境');
sandbox.service('components', Component.components);
sandbox.service('defineComponent', Component.define);
const disposeArr: Function[] = [];
sandbox.mounted(() => {
  const dispose = sandbox.app!.registerRender(async (template, message) => {
    const createContext = (context = {}, parent: Component.Context,$root:string): Component.Context => {
      return {
        $slots:{},
        ...message,
        ...context,
        $root,
        parent,
        render: (template: string, context) => {
          return renderWithRuntime(template,context,context.$root)
        },
      };
    };
    const renderWithRuntime=async (template:string,runtime:Dict,$root:string)=>{
      for (const [name, comp] of sandbox.components) {
        const match = comp.match(template);
        if(!match) continue
        const ctx=createContext({...runtime},{} as Component.Context,$root)
        return await comp.render(match,ctx)
      }
      return template
    }
    return await renderWithRuntime(template,{},template)
  });
  disposeArr.push(dispose);
});
sandbox.mounted(() => {
  sandbox.defineComponent({
    name: 'template',
    props: {
      $name: String,
    },
    render({ $name, ...props }, context) {
      if (!$name) return context.children || '';
      context.parent.$slots[$name] = async (p) => {
        return await context.render(context.children || '', { ...context, ...p });
      };
      return '';
    },
  });
  sandbox.defineComponent({
    name: 'slot',
    props: {
      name: String,
    },
    render({ name, ...props }, context) {
      name = name || 'default';
      if (!context.parent) return '';
      if (context.parent.$slots[name]) return context.parent.$slots[name](props, context) as string;
      return context.children || '';
    },
  });
});
sandbox.beforeMount(() => {
  while (disposeArr.length) {
    disposeArr.shift()?.();
  }
});
export default sandbox;
