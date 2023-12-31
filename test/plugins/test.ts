import { Plugin, segment } from '52bot';
import '@52bot/plugin-sandbox'
const test=new Plugin('测试插件2')
test.command('test-confirm')
  .action(async (runtime)=>{
    const isConfirm=await runtime.prompt.confirm('确认吗')
    return `${isConfirm?'已确认':'已取消'}:${isConfirm} ${typeof isConfirm}`
  })
test.command('test-text')
  .action(async (runtime)=>{
    const input=await runtime.prompt.text('请输入文本')
    return `inputResult:${input} ${typeof input}`
  })
test.command('test-number')
  .action(async (runtime)=>{
    const input=await runtime.prompt.number('请输入数值')
    return `inputResult:${input} ${typeof input}`
  })
test.command('test-list')
  .action(async (runtime)=>{
    const input=await runtime.prompt.list('请输入',{
      type:'text',
    })
    return `inputResult:${input} ${typeof input}`
  })
test.command('test-pick')
  .action(async ({prompt})=>{
    const input=await prompt.pick('请选择你喜欢的水果',{
      type:'text',
      multiple:true,
      options:[
        {
          label:'苹果',
          value:'apple'
        },
        {
          label:'香蕉',
          value:'banana',
        },
        {
          label:'橙子',
          value:'orange'
        }
      ]
    })
    return `inputResult:${input} ${typeof input}`
  })
test.command('md_btn')
.action(()=>{
  return [
    segment('text',{
      text:'123'
    }),
    segment('button',{
      id:"1",
      render_data:{
        label:'测试按钮',
        visited_label:'点过了'
      },
      action:{
        type: 2,
        permission:{
          type:0
        }
      }
    })
  ].join('')
})
test.command('cmd')
  .action(()=>{
    return segment('markdown',{
      content:`<cmd reply='true' cmd="/help">`
    })
  })
test.mounted(()=>{
  test.defineComponent({
    name:'test2',
    render(_,context){
      return `<slot/> 我在这儿`
    }
  })
  test.defineComponent({
    name:'test',
    props:{
      who:{
        type:String,
        default:'张三'
      }
    },
    render(props,context){
      return `hello ${context.who}`
    }
  })
})
test.command('notice')
  .action(async ()=>{
    return segment('markdown',{
      custom_template_id:'102005927_1702364737',
      params:[
        {
          key:'title',
          values:'52bot@0.0.1更新通知'
        },
        {
          key:'desc1',
          values:"添加指令解析能力"
        },
        {
          key:'desc2',
          values:"增加内置插件commandParser"
        },
        {
          key:'desc3',
          values:"增加内置插件echo"
        },
        {
          key:'desc4',
          values:"增加内置插件pluginPlugin"
        },
        {
          key:'desc5',
          values:"添加中间件能力"
        },
        {
          key:'text',
          values:'了解详情'
        },
        {
          key:'link',
          values:'https://github.com/lc-cn/52bot'
        }
      ]
    })
  })
test.command('btn')
  .action(async ()=>{
    return segment('markdown',{
      custom_template_id:'102005927_1704250658',
      params:[
        {
          key:'title',
          values:"帮助"
        },
        {
          key:'cmd1',
          values:encodeURI('插件管理')
        },
        {
          key:'cmd2',
          values:encodeURI('问答管理')
        },
        {
          key:'cmd3',
          values:encodeURI('一言')
        }
      ]
    })+segment('keyboard',{
      id:'102005927_1702366046'
    })
  })
export default test
