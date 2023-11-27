import {Plugin, segment} from '52bot';
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
    segment('markdown',{
      content:'hello'
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
export default test
